import { internalMutation, internalQuery, query } from './_generated/server';
import { v } from 'convex/values';

export const paymentStatusValidator = v.union(
  v.literal('pending'),
  v.literal('completed'),
  v.literal('failed'),
);

export const getBookOrderForCheckout = internalQuery({
  args: {
    bookOrderId: v.id('bookOrders'),
  },
  returns: v.union(
    v.null(),
    v.object({
      clerkUserId: v.string(),
      paymentStatus: v.union(paymentStatusValidator, v.null()),
      stripeSessionId: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.bookOrderId);
    if (!order) return null;
    return {
      clerkUserId: order.clerkUserId,
      paymentStatus: order.paymentStatus ?? null,
      stripeSessionId: order.stripeSessionId ?? null,
    };
  },
});

export const attachStripeSessionId = internalMutation({
  args: {
    bookOrderId: v.id('bookOrders'),
    stripeSessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bookOrderId, {
      stripeSessionId: args.stripeSessionId,
      paymentStatus: 'pending',
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const markBookOrderPaid = internalMutation({
  args: {
    bookOrderId: v.id('bookOrders'),
    stripeSessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.bookOrderId);
    if (!order) {
      console.error(`[billing] markBookOrderPaid: order ${args.bookOrderId} not found`);
      return null;
    }
    if (order.paymentStatus === 'completed') {
      return null;
    }
    await ctx.db.patch(args.bookOrderId, {
      paymentStatus: 'completed',
      stripeSessionId: args.stripeSessionId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const getBookOrderPaymentStatus = query({
  args: {
    bookOrderId: v.id('bookOrders'),
  },
  returns: v.union(
    v.null(),
    v.object({
      paymentStatus: v.union(paymentStatusValidator, v.null()),
      stripeSessionId: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const order = await ctx.db.get(args.bookOrderId);
    if (!order) return null;
    if (order.clerkUserId !== identity.subject) return null;
    return {
      paymentStatus: order.paymentStatus ?? null,
      stripeSessionId: order.stripeSessionId ?? null,
    };
  },
});
