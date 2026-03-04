/**
 * Public API for the book pipeline.
 * Entry points: startOrder, getOrderProgress, getStyleVoteImages, submitStyleVote, getDownloadUrl
 */

import { action, internalMutation, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';

// ── Start a new book order ─────────────────────────────────

export const startOrder = action({
  args: {
    childName: v.string(),
    ageBracket: v.union(v.literal('3-5'), v.literal('6-8'), v.literal('9+')),
    gender: v.union(v.literal('boy'), v.literal('girl')),
    problemId: v.string(),
    problemDetail: v.optional(v.string()),
    favoriteToy: v.optional(v.string()),
    glasses: v.boolean(),
    hairColor: v.string(),
    hairStyle: v.string(),
    eyeColor: v.string(),
    skinTone: v.string(),
    outfit: v.string(),
    email: v.optional(v.string()),
  },
  returns: v.object({ orderId: v.id('bookOrders') }),
  handler: async (ctx, args): Promise<{ orderId: Id<'bookOrders'> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const clerkUserId = identity.subject;

    // Rate limiting
    await ctx.runMutation(internal.rateLimitMutation.checkAndRecordLLMRateLimit, {
      actionType: 'llm_call',
      clerkUserId,
    });

    // Validate input lengths
    if (args.childName.length < 2 || args.childName.length > 30) {
      throw new Error('childName must be 2-30 characters');
    }
    if (args.problemDetail && args.problemDetail.length > 500) {
      throw new Error('problemDetail must be max 500 characters');
    }
    if (args.favoriteToy && args.favoriteToy.length > 100) {
      throw new Error('favoriteToy must be max 100 characters');
    }

    // Create order in DB
    const orderId: Id<'bookOrders'> = await ctx.runMutation(internal.bookPipeline.createOrder, {
      clerkUserId,
      childName: args.childName,
      ageBracket: args.ageBracket,
      gender: args.gender,
      problemId: args.problemId,
      problemDetail: args.problemDetail,
      favoriteToy: args.favoriteToy,
      glasses: args.glasses,
      hairColor: args.hairColor,
      hairStyle: args.hairStyle,
      eyeColor: args.eyeColor,
      skinTone: args.skinTone,
      outfit: args.outfit,
      email: args.email,
    });

    // Schedule A0 (intake)
    await ctx.scheduler.runAfter(0, internal.bookAgents.intake, { orderId });

    return { orderId };
  },
});

// ── Internal mutation to create order record ───────────────

export const createOrder = internalMutation({
  args: {
    clerkUserId: v.string(),
    childName: v.string(),
    ageBracket: v.union(v.literal('3-5'), v.literal('6-8'), v.literal('9+')),
    gender: v.union(v.literal('boy'), v.literal('girl')),
    problemId: v.string(),
    problemDetail: v.optional(v.string()),
    favoriteToy: v.optional(v.string()),
    glasses: v.boolean(),
    hairColor: v.string(),
    hairStyle: v.string(),
    eyeColor: v.string(),
    skinTone: v.string(),
    outfit: v.string(),
    email: v.optional(v.string()),
  },
  returns: v.id('bookOrders'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('bookOrders', {
      clerkUserId: args.clerkUserId,
      childName: args.childName,
      ageBracket: args.ageBracket,
      gender: args.gender,
      problemId: args.problemId,
      problemDetail: args.problemDetail,
      favoriteToy: args.favoriteToy,
      glasses: args.glasses,
      hairColor: args.hairColor,
      hairStyle: args.hairStyle,
      eyeColor: args.eyeColor,
      skinTone: args.skinTone,
      outfit: args.outfit,
      email: args.email,
      status: 'intake',
      createdAt: Date.now(),
    });
  },
});

// ── Get order progress (real-time subscription) ────────────

export const getOrderProgress = query({
  args: { orderId: v.id('bookOrders') },
  returns: v.object({
    status: v.string(),
    currentAgent: v.union(v.string(), v.null()),
    error: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.union(v.number(), v.null()),
    completedAt: v.union(v.number(), v.null()),
    hasStyleVoteImages: v.boolean(),
    chosenStyle: v.union(v.string(), v.null()),
    hasPdf: v.boolean(),
  }),
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error('Order not found');

    return {
      status: order.status,
      currentAgent: order.currentAgent ?? null,
      error: order.error ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt ?? null,
      completedAt: order.completedAt ?? null,
      hasStyleVoteImages: !!(order.styleVoteImageA && order.styleVoteImageB),
      chosenStyle: order.chosenStyle ?? null,
      hasPdf: !!order.pdfStorageId,
    };
  },
});

// ── Get style vote images ──────────────────────────────────

export const getStyleVoteImages = query({
  args: { orderId: v.id('bookOrders') },
  returns: v.object({
    imageUrlA: v.union(v.string(), v.null()),
    imageUrlB: v.union(v.string(), v.null()),
    status: v.string(),
  }),
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error('Order not found');

    let imageUrlA: string | null = null;
    let imageUrlB: string | null = null;

    if (order.styleVoteImageA) {
      imageUrlA = await ctx.storage.getUrl(order.styleVoteImageA);
    }
    if (order.styleVoteImageB) {
      imageUrlB = await ctx.storage.getUrl(order.styleVoteImageB);
    }

    return {
      imageUrlA,
      imageUrlB,
      status: order.status,
    };
  },
});

// ── Submit style vote ──────────────────────────────────────

export const submitStyleVote = mutation({
  args: {
    orderId: v.id('bookOrders'),
    choice: v.union(v.literal('A'), v.literal('B')),
  },
  returns: v.null(),
  handler: async (ctx, { orderId, choice }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const order = await ctx.db.get(orderId);
    if (!order) throw new Error('Order not found');
    if (order.clerkUserId !== identity.subject) throw new Error('Not authorized');
    if (order.status !== 'style_vote') throw new Error('Not in voting state');

    await ctx.db.patch(orderId, {
      chosenStyle: choice,
      updatedAt: Date.now(),
    });

    // Check if story track is also done
    await ctx.scheduler.runAfter(0, internal.bookPipelineHelpers.checkParallelTracksComplete, {
      orderId,
    });

    return null;
  },
});

// ── Get download URL ───────────────────────────────────────

export const getDownloadUrl = query({
  args: { orderId: v.id('bookOrders') },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order?.pdfStorageId) return null;
    return await ctx.storage.getUrl(order.pdfStorageId);
  },
});

// ── Get user's orders ──────────────────────────────────────

export const getMyOrders = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('bookOrders'),
      childName: v.string(),
      status: v.string(),
      createdAt: v.number(),
      completedAt: v.union(v.number(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const orders = await ctx.db
      .query('bookOrders')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', identity.subject))
      .collect();

    return orders.map((o) => ({
      _id: o._id,
      childName: o.childName,
      status: o.status,
      createdAt: o.createdAt,
      completedAt: o.completedAt ?? null,
    }));
  },
});
