// REFERENCE FILE — copied verbatim from aitutorc convex/billing.ts on the
// codex/stripe-billing-v1 branch. Not built. Use as a template when you wire
// bajkot's access-gating logic (book unlocks vs subscription Pro).
//
// Key concepts to lift:
// - getAccessState query: aggregates course readiness, subscription status,
//   free unlock count, unlocked page list — single source of truth for UI.
// - unlockFreeModule mutation: idempotent free-trial unlock with limit check.
// - syncSubscriptionFromStripe internal mutation: webhook landing point.
//
// Adaptation for bajkot:
// - Replace `courses` lookup with `bookOrders` (or whatever entity gates access).
// - Replace `moduleUnlocks` with `bookUnlocks` if you keep the freemium pattern,
//   or remove entirely if bajkot is one-shot per book.

import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { Doc } from './_generated/dataModel';
import { FREE_MODULE_LIMIT, getBillingAccessState, getLatestCourseForUser, getLatestSubscriptionForUser, getSubscriptionByStripeSubscriptionId, stripeSubscriptionStatusValidator } from './lib/billing';

const subscriptionStatusValidator = v.union(v.literal('none'), v.literal('incomplete'), v.literal('trialing'), v.literal('active'), v.literal('past_due'), v.literal('canceled'), v.literal('unpaid'));
type UnlockResult = {
  status: 'unlocked' | 'already_unlocked' | 'already_pro';
  freeUnlocksUsed: number;
  unlockedPageIndexes: number[];
};

export const getAccessState = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      courseId: v.union(v.id('courses'), v.null()),
      isCourseReady: v.boolean(),
      subscriptionStatus: subscriptionStatusValidator,
      isPro: v.boolean(),
      freeUnlockLimit: v.number(),
      freeUnlocksUsed: v.number(),
      unlockedPageIndexes: v.array(v.number()),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await getBillingAccessState(ctx, identity.subject);
  },
});

export const unlockFreeModule = mutation({
  args: {
    pageIndex: v.number(),
  },
  returns: v.object({
    status: v.union(v.literal('unlocked'), v.literal('already_unlocked'), v.literal('already_pro')),
    freeUnlocksUsed: v.number(),
    unlockedPageIndexes: v.array(v.number()),
  }),
  handler: async (ctx, args): Promise<UnlockResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const accessState = await getBillingAccessState(ctx, identity.subject);

    if (!accessState.isCourseReady || accessState.courseId === null) {
      throw new Error('Course not ready');
    }

    const courseId = accessState.courseId;

    if (accessState.isPro) {
      return {
        status: 'already_pro',
        freeUnlocksUsed: accessState.freeUnlocksUsed,
        unlockedPageIndexes: accessState.unlockedPageIndexes,
      };
    }

    const pageDoc = await ctx.db
      .query('courseDocuments')
      .withIndex('by_course_and_page', (q) => q.eq('courseId', courseId).eq('pageIndex', args.pageIndex))
      .first();

    if (!pageDoc || pageDoc.clerkUserId !== identity.subject) {
      throw new Error('Module not found');
    }

    if (accessState.unlockedPageIndexes.includes(args.pageIndex)) {
      return {
        status: 'already_unlocked',
        freeUnlocksUsed: accessState.freeUnlocksUsed,
        unlockedPageIndexes: accessState.unlockedPageIndexes,
      };
    }

    if (accessState.freeUnlocksUsed >= FREE_MODULE_LIMIT) {
      throw new Error('Free unlock limit reached');
    }

    await ctx.db.insert('moduleUnlocks', {
      clerkUserId: identity.subject,
      courseId,
      pageIndex: args.pageIndex,
      source: 'free_trial',
      createdAt: Date.now(),
    });

    return {
      status: 'unlocked',
      freeUnlocksUsed: accessState.freeUnlocksUsed + 1,
      unlockedPageIndexes: [...accessState.unlockedPageIndexes, args.pageIndex].sort((a, b) => a - b),
    };
  },
});

export const getStripeCustomerState = internalQuery({
  args: {
    clerkUserId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      stripeCustomerId: v.string(),
      subscriptionStatus: stripeSubscriptionStatusValidator,
    })
  ),
  handler: async (ctx, args) => {
    const subscription = await getLatestSubscriptionForUser(ctx, args.clerkUserId);
    if (!subscription) return null;
    return {
      stripeCustomerId: subscription.stripeCustomerId,
      subscriptionStatus: subscription.status,
    };
  },
});

export const getSubscriptionByStripeId = internalQuery({
  args: {
    stripeSubscriptionId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('subscriptions'),
      _creationTime: v.number(),
      clerkUserId: v.string(),
      courseId: v.optional(v.id('courses')),
      stripeCustomerId: v.string(),
      stripeSubscriptionId: v.string(),
      stripePriceId: v.string(),
      status: stripeSubscriptionStatusValidator,
      cancelAtPeriodEnd: v.boolean(),
      currentPeriodEnd: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await getSubscriptionByStripeSubscriptionId(ctx, args.stripeSubscriptionId);
  },
});

export const getBillingSummary = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      subscriptionStatus: subscriptionStatusValidator,
      isPro: v.boolean(),
      hasBillingCustomer: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const subscription = await getLatestSubscriptionForUser(ctx, identity.subject);
    const status: Doc<'subscriptions'>['status'] | 'none' = subscription?.status ?? 'none';

    return {
      subscriptionStatus: status,
      isPro: status === 'active' || status === 'trialing',
      hasBillingCustomer: Boolean(subscription?.stripeCustomerId),
    };
  },
});

export const syncSubscriptionFromStripe = internalMutation({
  args: {
    clerkUserId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    status: stripeSubscriptionStatusValidator,
    cancelAtPeriodEnd: v.boolean(),
    currentPeriodEnd: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await getSubscriptionByStripeSubscriptionId(ctx, args.stripeSubscriptionId);
    const now = Date.now();

    if (existing) {
      if (existing.clerkUserId !== args.clerkUserId) {
        console.warn(`[billing] Subscription ${args.stripeSubscriptionId} clerkUserId changing ` + `from ${existing.clerkUserId} to ${args.clerkUserId}`);
      }
      await ctx.db.patch(existing._id, {
        clerkUserId: args.clerkUserId,
        stripeCustomerId: args.stripeCustomerId,
        stripePriceId: args.stripePriceId,
        status: args.status,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        currentPeriodEnd: args.currentPeriodEnd,
        updatedAt: now,
      });
      return null;
    }

    const course = await getLatestCourseForUser(ctx, args.clerkUserId);

    await ctx.db.insert('subscriptions', {
      clerkUserId: args.clerkUserId,
      courseId: course?._id,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripePriceId: args.stripePriceId,
      status: args.status,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      currentPeriodEnd: args.currentPeriodEnd,
      createdAt: now,
      updatedAt: now,
    });

    return null;
  },
});
