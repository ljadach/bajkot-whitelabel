'use node';

import Stripe from 'stripe';
import { action, internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { LANDING_USER_ID } from './lib/roles';

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey);
}

function getAppUrl() {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    throw new Error('APP_URL is not configured');
  }
  return appUrl;
}

/**
 * Resolve the Stripe Price ID for a given order format.
 *
 * Two distinct Products live in the Stripe dashboard ("Bajka terapeutyczna — PDF"
 * and "Bajka terapeutyczna — PDF + Druk"), each with its own one-time Price in
 * PLN with tax_behavior=inclusive. The Price IDs are wired in via env vars so
 * the same code runs in dev (test mode) and prod (live mode) without changes.
 *
 * Legacy orders without an explicit format default to PDF — safer than
 * accidentally charging 49 PLN for a missing-format edge case.
 */
function resolvePriceId(format: 'pdf' | 'pdf_print' | null): string {
  const pdfPriceId = process.env.STRIPE_BOOK_PRICE_ID;
  const printPriceId = process.env.STRIPE_BOOK_PRINT_PRICE_ID;
  if (!pdfPriceId) {
    throw new Error('STRIPE_BOOK_PRICE_ID is not configured');
  }
  if (format === 'pdf_print') {
    if (!printPriceId) {
      throw new Error('STRIPE_BOOK_PRINT_PRICE_ID is not configured');
    }
    return printPriceId;
  }
  return pdfPriceId;
}

export const createCheckoutSession = action({
  args: {
    bookOrderId: v.id('bookOrders'),
    returnPath: v.optional(v.string()),
  },
  returns: v.object({
    url: v.string(),
    sessionId: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string; sessionId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const order = await ctx.runQuery(internal.billing.getBookOrderForCheckout, {
      bookOrderId: args.bookOrderId,
    });
    if (!order) {
      throw new Error('Book order not found');
    }
    if (order.clerkUserId !== identity.subject) {
      throw new Error('Book order does not belong to current user');
    }
    if (order.paymentStatus === 'completed') {
      throw new Error('Book order already paid');
    }

    const stripe = getStripeClient();
    const appUrl = getAppUrl();

    const returnPath = args.returnPath ?? `/book/${args.bookOrderId}/result`;
    const session: Stripe.Checkout.Session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: resolvePriceId(order.format), quantity: 1 }],
      billing_address_collection: 'auto',
      automatic_tax: { enabled: true },
      client_reference_id: args.bookOrderId,
      metadata: {
        clerkUserId: identity.subject,
        bookOrderId: args.bookOrderId,
        format: order.format ?? 'pdf',
      },
      payment_intent_data: {
        metadata: {
          clerkUserId: identity.subject,
          bookOrderId: args.bookOrderId,
          format: order.format ?? 'pdf',
        },
      },
      success_url: `${appUrl}${returnPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}${returnPath}?checkout=cancelled`,
      ...(identity.email ? { customer_email: identity.email } : {}),
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
 * Landing-flow Stripe Checkout. Mirrors `createCheckoutSession` but skips
 * the Clerk identity check — instead the caller proves access by passing
 * the `LANDING_ACCESS_TOKEN`. The webhook handler is identity-agnostic
 * (it uses `bookOrderId` from session metadata), so a landing payment
 * unlocks the same `markBookOrderPaid` path as an authenticated one.
 */
export const createLandingCheckoutSession = action({
  args: {
    bookOrderId: v.id('bookOrders'),
    accessToken: v.string(),
    returnPath: v.optional(v.string()),
  },
  returns: v.object({
    url: v.string(),
    sessionId: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string; sessionId: string }> => {
    // Per-order access token gate. Fails closed when the order has no hash
    // (legacy data) or the provided token doesn't match. Replaces the older
    // global LANDING_ACCESS_TOKEN check, which fell open when the env var
    // was missing.
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

    const stripe = getStripeClient();
    const appUrl = getAppUrl();

    const returnPath = args.returnPath ?? `/landing/book/${args.bookOrderId}/progress`;
    const session: Stripe.Checkout.Session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: resolvePriceId(order.format), quantity: 1 }],
      billing_address_collection: 'auto',
      automatic_tax: { enabled: true },
      client_reference_id: args.bookOrderId,
      metadata: {
        bookOrderId: args.bookOrderId,
        landing: 'true',
        format: order.format ?? 'pdf',
      },
      payment_intent_data: {
        metadata: {
          bookOrderId: args.bookOrderId,
          landing: 'true',
          format: order.format ?? 'pdf',
        },
      },
      success_url: `${appUrl}${returnPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}${returnPath}?checkout=cancelled`,
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

export const verifyWebhookEvent = internalAction({
  args: {
    payload: v.string(),
    signature: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      // Prefix lets stripeHttp distinguish config errors (→ 500, page us)
      // from signature errors (→ 400, Stripe stops retrying).
      throw new Error('[stripe-config] STRIPE_WEBHOOK_SECRET is not configured');
    }

    // Signature verification is the only step allowed to throw upward —
    // a failure here means a bad/forged caller and Stripe should get 400.
    const event = stripe.webhooks.constructEvent(args.payload, args.signature, webhookSecret);

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

      const rawBookOrderId =
        (session.metadata?.bookOrderId as string | undefined) ?? session.client_reference_id;
      if (!rawBookOrderId) {
        console.error(`[stripe-webhook] Missing bookOrderId on session ${session.id}`);
        return null;
      }

      await ctx.runMutation(internal.billing.markBookOrderPaid, {
        bookOrderId: rawBookOrderId as Id<'bookOrders'>,
        stripeSessionId: session.id,
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
