'use node';

import Stripe from 'stripe';
import { action, internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { LANDING_USER_ID } from './lib/roles';
import { bookFormatValidator } from './billing';
import { bookResultPath, resolvePartner } from './lib/partners';
import {
  STRIPE_MODES,
  currentStripeMode,
  paymentCounts,
  stripeConfigFor,
  type StripeMode,
} from './lib/stripeMode';

function getStripeClient(mode: StripeMode) {
  const { secretKey } = stripeConfigFor(mode);
  if (!secretKey) {
    throw new Error(`STRIPE_${mode.toUpperCase()}_SECRET_KEY is not configured`);
  }
  return new Stripe(secretKey);
}

function getAppUrl() {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    throw new Error('APP_URL is not configured');
  }
  return appUrl.replace(/\/+$/, '');
}

/**
 * Resolve the Stripe Price ID for a given mode and order format.
 *
 * Two Products live in each mode of the Stripe dashboard (PDF, PDF + print),
 * each with a one-time Price in PLN. Test and live prices have different IDs,
 * hence one pair of env vars per mode (see lib/stripeMode.ts).
 *
 * Orders without an explicit format default to PDF — safer than accidentally
 * charging the print price for a missing-format edge case.
 */
function resolvePriceId(mode: StripeMode, format: 'pdf' | 'pdf_print' | null): string {
  const { pdfPriceId, printPriceId } = stripeConfigFor(mode);
  const prefix = `STRIPE_${mode.toUpperCase()}`;
  if (!pdfPriceId) {
    throw new Error(`${prefix}_BOOK_PRICE_ID is not configured`);
  }
  if (format === 'pdf_print') {
    if (!printPriceId) {
      throw new Error(`${prefix}_BOOK_PRINT_PRICE_ID is not configured`);
    }
    return printPriceId;
  }
  return pdfPriceId;
}

/**
 * Stripe Checkout for an order. The caller proves access with the per-order
 * token; the webhook uses `bookOrderId` from session metadata, so payment
 * unlocks the order via `markBookOrderPaid`.
 *
 * Return URLs are built here from the order's partner, never taken from the
 * client — a client-supplied path appended to APP_URL is an open redirect.
 */
export const createLandingCheckoutSession = action({
  args: {
    bookOrderId: v.id('bookOrders'),
    accessToken: v.string(),
    /**
     * Format chosen at the paywall. Omit to bill the order's stored format.
     * Payment links send it explicitly so the parent can upgrade to print at
     * the last moment.
     */
    format: v.optional(bookFormatValidator),
  },
  returns: v.object({
    url: v.string(),
    sessionId: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string; sessionId: string }> => {
    // Per-order access token gate. Fails closed when the order has no hash
    // or the provided token doesn't match.
    const ok = await ctx.runQuery(internal.bookPipeline.verifyLandingTokenInternal, {
      orderId: args.bookOrderId,
      accessToken: args.accessToken,
    });
    if (!ok) {
      throw new Error('Invalid access token');
    }

    const order = await ctx.runQuery(internal.billing.getLandingBookOrderForCheckout, {
      bookOrderId: args.bookOrderId,
    });
    if (!order) {
      throw new Error('Book order not found');
    }
    if (order.clerkUserId !== LANDING_USER_ID) {
      throw new Error('Book order is not a landing order');
    }
    if (order.paymentStatus === 'completed') {
      throw new Error('Book order already paid');
    }

    // Format may be re-chosen at the paywall. Persist it first so price,
    // metadata, the fulfilment alert and the result page all agree — the
    // webhook reads the order, not this session.
    const format = args.format ?? order.format ?? 'pdf';
    if (args.format && args.format !== order.format) {
      await ctx.runMutation(internal.billing.setOrderFormat, {
        bookOrderId: args.bookOrderId,
        format: args.format,
      });
    }

    const mode = currentStripeMode();
    const stripe = getStripeClient(mode);
    const partner = resolvePartner(order.partnerId);
    const returnUrl = `${getAppUrl()}${bookResultPath(partner.id, args.bookOrderId)}`;

    // Print with no address on file (upgraded after intake) — let Checkout
    // collect it; the webhook writes it back before the fulfilment alert.
    const needsShipping = format === 'pdf_print' && !order.hasShippingAddress;

    const note =
      mode === 'test'
        ? `${partner.name} — płatność testowa. Zapłać kartą 4242 4242 4242 4242, dowolna przyszła data i CVC. Nic nie zostanie pobrane.`
        : `Personalizowana bajka od ${partner.name}.`;

    const session: Stripe.Checkout.Session = await stripe.checkout.sessions.create({
      mode: 'payment',
      allow_promotion_codes: true,
      line_items: [{ price: resolvePriceId(mode, format), quantity: 1 }],
      billing_address_collection: 'auto',
      ...(needsShipping
        ? {
            shipping_address_collection: { allowed_countries: ['PL' as const] },
            phone_number_collection: { enabled: true },
          }
        : {}),
      // Stripe Tax needs its own setup in the Stripe account; off unless
      // explicitly enabled so a fresh test account can take payments.
      ...(process.env.STRIPE_AUTOMATIC_TAX === 'true' ? { automatic_tax: { enabled: true } } : {}),
      custom_text: { submit: { message: note } },
      client_reference_id: args.bookOrderId,
      metadata: {
        bookOrderId: args.bookOrderId,
        partnerId: partner.id,
        format,
      },
      payment_intent_data: {
        metadata: {
          bookOrderId: args.bookOrderId,
          partnerId: partner.id,
          format,
        },
      },
      success_url: `${returnUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?checkout=cancelled`,
      ...(order.email ? { customer_email: order.email } : {}),
    });

    if (!session.url) {
      throw new Error('Stripe checkout session did not return a URL');
    }

    await ctx.runMutation(internal.billing.attachStripeSessionId, {
      bookOrderId: args.bookOrderId,
      stripeSessionId: session.id,
    });

    return { url: session.url, sessionId: session.id };
  },
});

/**
 * Verify the webhook signature against every configured mode's secret. The
 * same URL is registered as an endpoint in both the test and the live Stripe
 * dashboard, each with its own signing secret, and an event only tells us its
 * mode (`livemode`) after it has been verified.
 */
function constructEventAnyMode(payload: string, signature: string): Stripe.Event {
  const secrets = STRIPE_MODES.map((mode) => stripeConfigFor(mode).webhookSecret).filter(
    (secret): secret is string => Boolean(secret),
  );
  if (secrets.length === 0) {
    // Prefix lets stripeHttp distinguish config errors (→ 500, page us)
    // from signature errors (→ 400, Stripe stops retrying).
    throw new Error('[stripe-config] No STRIPE_{TEST|LIVE}_WEBHOOK_SECRET is configured');
  }
  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return Stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export const verifyWebhookEvent = internalAction({
  args: {
    payload: v.string(),
    signature: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    // Signature verification is the only step allowed to throw upward —
    // a failure here means a bad/forged caller and Stripe should get 400.
    const event = constructEventAnyMode(args.payload, args.signature);

    // Once the signature is verified, ack to Stripe regardless of business
    // outcome. Anything we throw past this point would trigger Stripe's
    // retry storm (up to 3 days). Business issues (missing order, malformed
    // metadata) are already permanent, not transient — log and move on.
    try {
      if (event.type !== 'checkout.session.completed') {
        return null;
      }

      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'payment') {
        console.warn(
          `[stripe-webhook] Ignoring non-payment session: mode=${session.mode}, id=${session.id}`,
        );
        return null;
      }
      if (session.payment_status !== 'paid') {
        console.warn(
          `[stripe-webhook] Session not paid: status=${session.payment_status}, id=${session.id}`,
        );
        return null;
      }

      const paymentMode: StripeMode = event.livemode ? 'live' : 'test';
      const siteMode = currentStripeMode();
      if (!paymentCounts(paymentMode, siteMode)) {
        console.warn(
          `[stripe-webhook] Ignoring test-mode payment ${session.id}: STRIPE_MODE is ${siteMode}`,
        );
        return null;
      }

      const rawBookOrderId =
        (session.metadata?.bookOrderId as string | undefined) ?? session.client_reference_id;
      if (!rawBookOrderId) {
        console.error(`[stripe-webhook] Missing bookOrderId on session ${session.id}`);
        return null;
      }

      // Address Checkout collected for a print upgrade. Written first —
      // `markBookOrderPaid` schedules the fulfilment alert, and an alert
      // without an address is a package nobody can send.
      const shipping = session.collected_information?.shipping_details;
      if (shipping?.address) {
        const { line1, line2, postal_code, city } = shipping.address;
        await ctx.runMutation(internal.billing.attachShippingAddress, {
          bookOrderId: rawBookOrderId as Id<'bookOrders'>,
          address: {
            fullName: shipping.name || session.customer_details?.name || '',
            phone: session.customer_details?.phone ?? '',
            street: [line1, line2].filter(Boolean).join(', '),
            zip: postal_code ?? '',
            city: city ?? '',
          },
        });
      }

      await ctx.runMutation(internal.billing.markBookOrderPaid, {
        bookOrderId: rawBookOrderId as Id<'bookOrders'>,
        stripeSessionId: session.id,
        paymentMode,
        // What actually moved (promotion codes can lower it) — shown in the
        // confirmation e-mail instead of a price constant.
        amountTotalMinor: session.amount_total ?? undefined,
        currency: session.currency ?? undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[stripe-webhook] Post-verification processing failed (event=${event.id}, type=${event.type}): ${message}`,
      );
    }

    return null;
  },
});
