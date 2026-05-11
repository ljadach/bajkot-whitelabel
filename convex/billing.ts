import { internalMutation, internalQuery, query } from './_generated/server';
import { internal } from './_generated/api';
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

/**
 * Internal helper for landing-flow Stripe checkout: also exposes the
 * order's email so the public landing action can pre-fill Stripe's
 * `customer_email`. Landing orders have no Clerk identity, so the
 * caller validates against LANDING_ACCESS_TOKEN instead.
 */
export const getLandingBookOrderForCheckout = internalQuery({
  args: {
    bookOrderId: v.id('bookOrders'),
  },
  returns: v.union(
    v.null(),
    v.object({
      clerkUserId: v.string(),
      email: v.union(v.string(), v.null()),
      paymentStatus: v.union(paymentStatusValidator, v.null()),
      stripeSessionId: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.bookOrderId);
    if (!order) return null;
    return {
      clerkUserId: order.clerkUserId,
      email: order.email ?? null,
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
    // Hand off the "Mamy Twoje zamówienie" confirmation email. The PDF isn't
    // ready yet — that mail is sent later from markOrderComplete. Scheduled
    // rather than awaited so a Resend hiccup doesn't fail the webhook
    // (Stripe would retry, double-flipping paid status).
    await ctx.scheduler.runAfter(0, internal.email.sendOrderConfirmation, {
      bookOrderId: args.bookOrderId,
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
