import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { generateLandingAccessToken, sha256Hex } from './landingToken';

/**
 * Mint a shareable payment link for an existing order.
 *
 * Recovery path for orders that were generated but never paid — a failed
 * pipeline we retried by hand, an abandoned checkout, a print upgrade agreed
 * over the phone. The link drops the parent straight on the paywall of
 * `/landing/book/:id/result`, where they pick PDF or PDF+print and pay; the
 * existing webhook then delivers the PDF and alerts fulfilment for print.
 *
 * The landing token is stored hashed and returned raw exactly once at intake,
 * so there is nothing to look up — a link means minting a fresh token, which
 * **invalidates the previous one**. Any older link (including the one in the
 * parent's delivery email) stops working, so always send the new one.
 *
 * Lives here rather than in either caller because both the admin mutation and
 * its headless CLI twin need exactly this, and a copy in each drifts.
 */
export async function mintPaymentLink(
  ctx: MutationCtx,
  orderId: Id<'bookOrders'>,
): Promise<{ url: string; invalidatedPrevious: boolean }> {
  const order = await ctx.db.get(orderId);
  if (!order) throw new Error('Zamówienie nie istnieje');
  if (order.paymentStatus === 'completed') {
    throw new Error('Zamówienie jest już opłacone — link do płatności nic nie zmieni');
  }

  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error('APP_URL nie jest skonfigurowany');

  const rawToken = generateLandingAccessToken();
  await ctx.db.patch(orderId, {
    accessTokenHash: await sha256Hex(rawToken),
    updatedAt: Date.now(),
  });

  return {
    url: `${appUrl}/landing/book/${orderId}/result?t=${rawToken}`,
    invalidatedPrevious: Boolean(order.accessTokenHash),
  };
}
