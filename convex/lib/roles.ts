/**
 * Order access control.
 *
 * The white-label build has no login: every order is placed through the
 * public order flow and belongs to the synthetic LANDING_USER_ID. Callers
 * prove ownership with the per-order capability token returned once by
 * `startLandingOrder` (and embedded in transactional e-mail links).
 */

import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { DataModel, Id } from '../_generated/dataModel';
import { sha256Hex, timingSafeEqual } from './landingToken';
import { LANDING_USER_ID } from './userSentinels';

type DbCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

export { LANDING_USER_ID };

/**
 * Assert the order is a landing-page order (no auth, clerkUserId === LANDING_USER_ID)
 * AND the caller proved ownership via the per-order access token. The raw
 * token is hashed and compared against the stored `accessTokenHash` using a
 * timing-safe equality check. Returns the order document for further use.
 *
 * Fails closed: orders without a stored hash (legacy data) are rejected.
 */
export async function assertLandingOrder(
  ctx: DbCtx,
  orderId: Id<'bookOrders'>,
  accessToken: string,
) {
  const order = await ctx.db.get(orderId);
  if (!order) throw new Error('Order not found');
  if (order.clerkUserId !== LANDING_USER_ID) throw new Error('Not a landing order');
  if (!order.accessTokenHash) throw new Error('Not authorized');
  if (!accessToken) throw new Error('Not authorized');
  const provided = await sha256Hex(accessToken);
  if (!timingSafeEqual(provided, order.accessTokenHash)) throw new Error('Not authorized');
  return order;
}
