/**
 * Internal queries and mutations for the book pipeline.
 * NO "use node" — this file contains only queries and mutations.
 */

import { internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

// ── Get Order ──────────────────────────────────────────────

export const getOrder = internalQuery({
  args: { orderId: v.id('bookOrders') },
  returns: v.any(),
  handler: async (ctx, { orderId }) => {
    return await ctx.db.get(orderId);
  },
});

// ── Update Order Status ────────────────────────────────────

export const updateOrderStatus = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    status: v.string(),
    currentAgent: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      // args.status is v.string() for flexibility — callers pass typed BookOrderStatus values.
      // The `as any` avoids coupling this internal mutation to the union type.
      status: args.status as any,
      currentAgent: args.currentAgent,
      updatedAt: Date.now(),
      ...(args.error !== undefined ? { error: args.error } : {}),
    });
    return null;
  },
});

// ── Update Order Artifact ──────────────────────────────────

export const updateOrderArtifact = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    field: v.string(),
    value: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { orderId, field, value }) => {
    await ctx.db.patch(orderId, {
      [field]: value,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ── Update Retry Count ─────────────────────────────────────

export const updateRetryCount = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    retryCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { orderId, retryCount }) => {
    await ctx.db.patch(orderId, {
      retryCount,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ── Update Visual QA Retry Count ─────────────────────────

export const updateVisualQaRetryCount = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    visualQaRetryCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { orderId, visualQaRetryCount }) => {
    await ctx.db.patch(orderId, {
      visualQaRetryCount,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ── Save Illustration ──────────────────────────────────────

export const saveIllustration = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    illustrationId: v.string(),
    storageId: v.id('_storage'),
    prompt: v.string(),
    width: v.number(),
    height: v.number(),
    sceneRef: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert('bookIllustrations', {
      orderId: args.orderId,
      illustrationId: args.illustrationId,
      storageId: args.storageId,
      prompt: args.prompt,
      width: args.width,
      height: args.height,
      sceneRef: args.sceneRef,
      createdAt: Date.now(),
    });
    return null;
  },
});

// ── Update Style Vote Images ───────────────────────────────

export const updateStyleVoteImages = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    styleVoteImageA: v.id('_storage'),
    styleVoteImageB: v.id('_storage'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      styleVoteImageA: args.styleVoteImageA,
      styleVoteImageB: args.styleVoteImageB,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ── Update PDF Storage ID ──────────────────────────────────

export const updatePdfStorageId = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    pdfStorageId: v.id('_storage'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      pdfStorageId: args.pdfStorageId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ── Mark Order Complete ────────────────────────────────────

export const markOrderComplete = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
  },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    await ctx.db.patch(orderId, {
      status: 'completed' as const,
      currentAgent: undefined,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ── Check Parallel Tracks Complete ─────────────────────────
// Called by A5 (end of story track) and submitStyleVote (end of image track).
// When both tracks are done, schedules A7 (illustrate).

export const checkParallelTracksComplete = internalMutation({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) return null;

    // Story track done = illustrationPlan exists (A5 output)
    const storyTrackDone = !!order.illustrationPlan;
    // Image track done = user has voted
    const imageTrackDone = !!order.chosenStyle;

    if (storyTrackDone && imageTrackDone && order.status !== 'illustrating') {
      // Both tracks complete — start A7 (illustrate)
      // Guard: set status atomically to prevent double-scheduling
      await ctx.db.patch(orderId, { status: 'illustrating' as const, updatedAt: Date.now() });
      await ctx.scheduler.runAfter(0, internal.bookAgents.illustrate, { orderId });
    }
    return null;
  },
});

// ── Get Illustrations for Order ────────────────────────────

export const getIllustrations = internalQuery({
  args: { orderId: v.id('bookOrders') },
  returns: v.any(),
  handler: async (ctx, { orderId }) => {
    return await ctx.db
      .query('bookIllustrations')
      .withIndex('by_order', (q) => q.eq('orderId', orderId))
      .collect();
  },
});
