import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { assertAdmin } from '../lib/roles';
import { auditLog } from '../lib/adminGuards';
import { paymentStatusValidator } from '../billing';

const STRIPE_TEST_PROBLEM_ID = 'stripe-test';

export const createTestOrder = mutation({
  args: {},
  returns: v.object({
    bookOrderId: v.id('bookOrders'),
  }),
  handler: async (ctx) => {
    const { subject } = await assertAdmin(ctx);
    const now = Date.now();
    const bookOrderId = await ctx.db.insert('bookOrders', {
      clerkUserId: subject,
      childName: `Stripe Test ${new Date(now).toISOString().slice(11, 19)}`,
      ageBracket: '6-8',
      gender: 'girl',
      problemId: STRIPE_TEST_PROBLEM_ID,
      glasses: false,
      hairColor: 'brown',
      hairStyle: 'short',
      eyeColor: 'brown',
      skinTone: 'light',
      outfit: 'casual',
      status: 'paused',
      paymentStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    });
    await auditLog(ctx, subject, 'stripe.createTestOrder', bookOrderId);
    return { bookOrderId };
  },
});

export const listTestOrders = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('bookOrders'),
      childName: v.string(),
      paymentStatus: v.union(paymentStatusValidator, v.null()),
      stripeSessionId: v.union(v.string(), v.null()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const { subject } = await assertAdmin(ctx);
    const orders = await ctx.db
      .query('bookOrders')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', subject))
      .filter((q) => q.eq(q.field('problemId'), STRIPE_TEST_PROBLEM_ID))
      .order('desc')
      .take(20);
    return orders.map((o) => ({
      _id: o._id,
      childName: o.childName,
      paymentStatus: o.paymentStatus ?? null,
      stripeSessionId: o.stripeSessionId ?? null,
      createdAt: o.createdAt,
    }));
  },
});

export const deleteTestOrder = mutation({
  args: {
    bookOrderId: v.id('bookOrders'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { subject } = await assertAdmin(ctx);
    const order = await ctx.db.get(args.bookOrderId);
    if (!order) return null;
    if (order.clerkUserId !== subject || order.problemId !== STRIPE_TEST_PROBLEM_ID) {
      throw new Error('Not a stripe test order owned by this admin');
    }
    await ctx.db.delete(args.bookOrderId);
    await auditLog(ctx, subject, 'stripe.deleteTestOrder', args.bookOrderId);
    return null;
  },
});

export const stripeConfigStatus = query({
  args: {},
  returns: v.object({
    secretKeyConfigured: v.boolean(),
    webhookSecretConfigured: v.boolean(),
    priceIdConfigured: v.boolean(),
    appUrlConfigured: v.boolean(),
  }),
  handler: async (ctx) => {
    await assertAdmin(ctx);
    return {
      secretKeyConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      webhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      priceIdConfigured: Boolean(process.env.STRIPE_BOOK_PRICE_ID),
      appUrlConfigured: Boolean(process.env.APP_URL),
    };
  },
});
