import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { generateLandingAccessToken, sha256Hex } from './landingToken';
import { bookResultPath } from './partners';

/**
 * Mint a shareable payment link for an existing order.
 *
 * Recovery path for orders that were generated but never paid — a failed
 * pipeline we retried by hand, an abandoned checkout, a print upgrade agreed
 * over the phone. The link drops the parent straight on the paywall of the
 * order's result page (in its partner's theme), where they pick PDF or
 * PDF+print and pay; the webhook then delivers the PDF and alerts fulfilment
 * for print.
 *
 * The landing token is stored hashed and returned raw exactly once at intake,
 * so there is nothing to look up — a link means minting a fresh token, which
 * **invalidates the previous one**. Any older link (including the one in the
 * parent's delivery email) stops working, so always send the new one.
 *
 * Called by the CLI (`cli:createPaymentLink`).
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
    // The confirmation and book-ready e-mails embed the raw token — keep it
    // in step with the hash or their links die with the old token.
    accessTokenRaw: rawToken,
    updatedAt: Date.now(),
  });

  return {
    url: `${appUrl.replace(/\/+$/, '')}${bookResultPath(order.partnerId, orderId)}?t=${rawToken}`,
    invalidatedPrevious: Boolean(order.accessTokenHash),
  };
}
