/**
 * Meta Conversions API — server-side Purchase reporting.
 *
 * Why this exists at all: the browser pixel loses a large share of events
 * to iOS tracking prevention and ad-blockers, and it loses them unevenly —
 * the people most likely to block are not the people least likely to buy.
 * On a site with Bajkoterapia's traffic, a missing purchase is not a
 * rounding error, it is a meaningful fraction of the entire signal Meta
 * has to learn from. The Stripe webhook already knows, authoritatively,
 * that money moved; this module tells Meta the same thing over a channel
 * no browser extension can interrupt.
 *
 * Deduplication: `metaPurchaseEventId` here and in src/lib/metaPixel.ts
 * must produce the identical string. Meta collapses events sharing
 * (event_name, event_id), so whichever of the two arrives first wins and
 * the other is discarded. Keep the two formulas in sync.
 *
 * Consent: an order whose `metaAttribution.marketingConsent` is not `true`
 * is never sent. That is the same cookie-banner decision the browser pixel
 * obeys, enforced a second time on the server because the server is the
 * path a rejected visitor cannot see or block.
 *
 * Configuration (Convex env, per deployment):
 *   META_PIXEL_ID           — the dataset id from Events Manager
 *   META_CAPI_ACCESS_TOKEN  — Events Manager → Settings → Conversions API
 *   META_CAPI_TEST_CODE     — optional; set while verifying in the "Test
 *                             events" tab, then REMOVE. Events carrying a
 *                             test code do not count towards reporting or
 *                             audiences.
 * Missing pixel id or token = silent no-op, so this ships before the Meta
 * account exists without breaking payments.
 */

import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

const GRAPH_API_VERSION = 'v21.0';

/**
 * Deduplication key. MUST stay byte-identical to `metaPurchaseEventId` in
 * src/lib/metaPixel.ts — derived from the order id alone, with no
 * timestamp and no randomness, so the two sides collide on purpose.
 */
export function metaPurchaseEventId(orderId: string): string {
  return `purchase_${orderId}`;
}

/**
 * Meta requires identifying fields hashed with SHA-256 over the normalised
 * value (lowercased, trimmed). Convex actions run on a runtime with Web
 * Crypto, so no dependency is needed.
 */
async function hashNormalized(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Report a completed purchase to Meta.
 *
 * Scheduled from `billing.markBookOrderPaid` AFTER its already-completed
 * short-circuit, which means Stripe's retry storm cannot make this fire
 * twice even before Meta's own deduplication gets involved.
 *
 * Never throws upward: a Meta outage must not turn into a failed webhook
 * and a customer whose payment looks unprocessed.
 */
export const sendPurchase = internalAction({
  args: {
    bookOrderId: v.id('bookOrders'),
    value: v.number(),
    currency: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const pixelId = process.env.META_PIXEL_ID;
    const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
    if (!pixelId || !accessToken) {
      // Unconfigured deployment — expected before the Meta account exists.
      return null;
    }

    try {
      const order = await ctx.runQuery(internal.billing.getOrderForMetaCapi, {
        bookOrderId: args.bookOrderId,
      });
      if (!order) {
        console.error(`[meta-capi] Order ${args.bookOrderId} not found`);
        return null;
      }

      const meta = order.metaAttribution;
      if (!meta || meta.marketingConsent !== true) {
        // Visitor rejected (or never saw) the cookie banner. Silence is the
        // correct behaviour, not an error.
        return null;
      }

      // Match keys, best effort. Meta needs at least one; with none the
      // event is accepted but attributes to nobody, so we skip instead of
      // spending an API call on a guaranteed non-match.
      const userData: Record<string, unknown> = {};
      if (meta.fbp) userData.fbp = meta.fbp;
      if (meta.fbc) userData.fbc = meta.fbc;
      if (meta.userAgent) userData.client_user_agent = meta.userAgent;
      if (order.email) userData.em = [await hashNormalized(order.email)];

      if (!userData.fbp && !userData.fbc && !userData.em) {
        console.warn(`[meta-capi] No match keys for order ${args.bookOrderId}; skipping`);
        return null;
      }

      const payload: Record<string, unknown> = {
        data: [
          {
            event_name: 'Purchase',
            event_time: Math.floor(Date.now() / 1000),
            event_id: metaPurchaseEventId(args.bookOrderId),
            action_source: 'website',
            event_source_url: meta.eventSourceUrl,
            user_data: userData,
            custom_data: {
              value: args.value,
              currency: args.currency,
              content_type: 'product',
            },
          },
        ],
      };
      // Present only while verifying in Events Manager → Test events.
      const testCode = process.env.META_CAPI_TEST_CODE;
      if (testCode) payload.test_event_code = testCode;

      const response = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        // Body carries Meta's diagnostic — worth logging, it is the only
        // way to tell a bad token from a malformed payload.
        const body = await response.text();
        console.error(`[meta-capi] Purchase rejected (${response.status}): ${body}`);
        return null;
      }

      console.log(`[meta-capi] Purchase sent for order ${args.bookOrderId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[meta-capi] Purchase failed for order ${args.bookOrderId}: ${message}`);
    }

    return null;
  },
});

/** Re-exported for callers that only need the id shape. */
export type MetaPurchaseOrderId = Id<'bookOrders'>;
