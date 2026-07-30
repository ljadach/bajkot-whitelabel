import { mutation } from '../_generated/server';
import { v } from 'convex/values';
import { assertAdmin } from '../lib/roles';
import { auditLog } from '../lib/adminGuards';
import { mintPaymentLink } from '../lib/paymentLink';

/**
 * Admin-facing payment link. See `lib/paymentLink.ts` for what a link is and
 * why minting one revokes the previous.
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
    const link = await mintPaymentLink(ctx, orderId);
    await auditLog(ctx, subject, 'order.createPaymentLink', orderId);
    return link;
  },
});
