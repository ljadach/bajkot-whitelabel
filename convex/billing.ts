import { internalMutation, internalQuery, query } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

export const paymentStatusValidator = v.union(
  v.literal('pending'),
  v.literal('completed'),
  v.literal('failed'),
);

export const bookFormatValidator = v.union(v.literal('pdf'), v.literal('pdf_print'));

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
      format: v.union(bookFormatValidator, v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.bookOrderId);
    if (!order) return null;
    return {
      clerkUserId: order.clerkUserId,
      paymentStatus: order.paymentStatus ?? null,
      stripeSessionId: order.stripeSessionId ?? null,
      format: order.format ?? null,
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
      format: v.union(bookFormatValidator, v.null()),
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
      format: order.format ?? null,
      hasShippingAddress: Boolean(order.shippingAddress),
    };
  },
});

/**
 * Switch an unpaid order between PDF and PDF+print.
 *
 * The format is normally frozen at intake, but a payment link lets the parent
 * pick at checkout time — the book itself is identical, only fulfilment and
 * price differ. Refuses once paid so a completed order can never be silently
 * repriced.
 */
export const setOrderFormat = internalMutation({
  args: {
    bookOrderId: v.id('bookOrders'),
    format: bookFormatValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.bookOrderId);
    if (!order) throw new Error('Book order not found');
    if (order.paymentStatus === 'completed') {
      throw new Error('Cannot change format on a paid order');
    }
    if (order.format === args.format) return null;
    await ctx.db.patch(args.bookOrderId, { format: args.format, updatedAt: Date.now() });
    return null;
  },
});

/**
 * Persist the shipping address Stripe Checkout collected for us.
 *
 * Orders placed through the normal flow carry an address from the intake form;
 * ones upgraded to print via a payment link don't, so Checkout collects it and
 * the webhook lands it here. Must run *before* `markBookOrderPaid` — that's
 * what schedules the fulfilment alert, which is useless without an address.
 * Never overwrites an address the parent already gave us.
 */
export const attachShippingAddress = internalMutation({
  args: {
    bookOrderId: v.id('bookOrders'),
    fullName: v.string(),
    phone: v.string(),
    street: v.string(),
    zip: v.string(),
    city: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.bookOrderId);
    if (!order || order.shippingAddress) return null;
    await ctx.db.patch(args.bookOrderId, {
      shippingAddress: {
        fullName: args.fullName,
        phone: args.phone,
        street: args.street,
        zip: args.zip,
        city: args.city,
      },
      updatedAt: Date.now(),
    });
    return null;
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
    // Hand off the "Mamy Twoje zamówienie" confirmation email. Scheduled
    // rather than awaited so a Resend hiccup doesn't fail the webhook
    // (Stripe would retry, double-flipping paid status).
    await ctx.scheduler.runAfter(0, internal.email.sendOrderConfirmation, {
      bookOrderId: args.bookOrderId,
    });
    // Generate-before-payment: by the time the webhook lands the pipeline has
    // usually finished, so the delivery email (full PDF link) goes out here —
    // never earlier. The reverse order (paid before the PDF exists) is
    // covered by bookPipelineHelpers.markOrderComplete.
    if (order.status === 'completed') {
      await ctx.scheduler.runAfter(0, internal.email.sendBookReady, {
        bookOrderId: args.bookOrderId,
      });
    }
    // PDF+Print: fire a parallel internal alert to the fulfillment inbox so
    // the team can start printing/packing while the customer's PDF download
    // is still in flight. Pipeline already ran — physical book ships in 3–5d.
    if (order.format === 'pdf_print') {
      await ctx.scheduler.runAfter(0, internal.email.sendAdminPrintAlert, {
        bookOrderId: args.bookOrderId,
      });
    }
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
