import { mutation } from '../_generated/server';
import { v } from 'convex/values';
import { assertAdmin } from '../lib/roles';
import { auditLog } from '../lib/adminGuards';
import { generateLandingAccessToken, sha256Hex } from '../lib/landingToken';

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
 */
export const createPaymentLink = mutation({
  args: { orderId: v.id('bookOrders') },
  returns: v.object({
    url: v.string(),
    /** True when an earlier link existed and has just been revoked. */
    invalidatedPrevious: v.boolean(),
  }),
  handler: async (ctx, { orderId }) => {
    const { subject } = await assertAdmin(ctx);

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
    await auditLog(ctx, subject, 'order.createPaymentLink', orderId);

    return {
      url: `${appUrl}/landing/book/${orderId}/result?t=${rawToken}`,
      invalidatedPrevious: Boolean(order.accessTokenHash),
    };
  },
});
