// REFERENCE FILE — copied verbatim from aitutorc convex/lib/billing.ts on the
// codex/stripe-billing-v1 branch. Not built. Use as a template for the bajkot
// access-gating helpers (book entitlement queries, unlock aggregation).

import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { DataModel, Doc, Id } from '../_generated/dataModel';
import { v } from 'convex/values';

export const stripeSubscriptionStatusValidator = v.union(
  v.literal('incomplete'),
  v.literal('trialing'),
  v.literal('active'),
  v.literal('past_due'),
  v.literal('canceled'),
  v.literal('unpaid')
);

type BillingCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

export const FREE_MODULE_LIMIT = 2;
export const ACTIVE_SUBSCRIPTION_STATUSES = new Set<Doc<'subscriptions'>['status']>(['active', 'trialing']);

export async function getLatestCourseForUser(ctx: BillingCtx, clerkUserId: string): Promise<Doc<'courses'> | null> {
  const courses = await ctx.db
    .query('courses')
    .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', clerkUserId))
    .collect();

  if (courses.length === 0) return null;

  return (
    courses.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return b.createdAt - a.createdAt;
    })[0] ?? null
  );
}

export async function getLatestSubscriptionForUser(ctx: BillingCtx, clerkUserId: string): Promise<Doc<'subscriptions'> | null> {
  const subscriptions = await ctx.db
    .query('subscriptions')
    .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', clerkUserId))
    .collect();

  if (subscriptions.length === 0) return null;

  return subscriptions.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}

export async function getSubscriptionByStripeSubscriptionId(ctx: BillingCtx, stripeSubscriptionId: string): Promise<Doc<'subscriptions'> | null> {
  return await ctx.db
    .query('subscriptions')
    .withIndex('by_stripe_subscription', (q) => q.eq('stripeSubscriptionId', stripeSubscriptionId))
    .first();
}

export async function getUnlockedPageIndexes(ctx: BillingCtx, clerkUserId: string, courseId: Id<'courses'>): Promise<number[]> {
  const unlocks = await ctx.db
    .query('moduleUnlocks')
    .withIndex('by_clerk_user_course', (q) => q.eq('clerkUserId', clerkUserId).eq('courseId', courseId))
    .collect();

  return [...new Set(unlocks.map((unlock) => unlock.pageIndex))].sort((a, b) => a - b);
}

export async function getBillingAccessState(
  ctx: BillingCtx,
  clerkUserId: string
): Promise<{
  courseId: Id<'courses'> | null;
  isCourseReady: boolean;
  subscriptionStatus: Doc<'subscriptions'>['status'] | 'none';
  isPro: boolean;
  freeUnlockLimit: number;
  freeUnlocksUsed: number;
  unlockedPageIndexes: number[];
}> {
  const course = await getLatestCourseForUser(ctx, clerkUserId);
  const subscription = await getLatestSubscriptionForUser(ctx, clerkUserId);
  const isPro = subscription ? ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) : false;
  const unlockedPageIndexes = course ? await getUnlockedPageIndexes(ctx, clerkUserId, course._id) : [];

  return {
    courseId: course?._id ?? null,
    isCourseReady: course !== null,
    subscriptionStatus: subscription?.status ?? 'none',
    isPro,
    freeUnlockLimit: FREE_MODULE_LIMIT,
    freeUnlocksUsed: unlockedPageIndexes.length,
    unlockedPageIndexes,
  };
}

export async function canUserAccessPage(ctx: BillingCtx, clerkUserId: string, courseId: Id<'courses'>, pageIndex: number): Promise<boolean> {
  const subscription = await getLatestSubscriptionForUser(ctx, clerkUserId);
  if (subscription && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return true;
  }

  const unlockedPages = await getUnlockedPageIndexes(ctx, clerkUserId, courseId);
  return unlockedPages.includes(pageIndex);
}
