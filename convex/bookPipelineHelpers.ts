/**
 * Internal queries and mutations for the book pipeline.
 * NO "use node" — this file contains only queries and mutations.
 */

import { internalMutation, internalQuery, type MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { type Id } from './_generated/dataModel';
import { getNarrative } from './bookPipelineEvents';
import {
  shouldUpdateStatus,
  POST_CONVERGENCE_STATUSES,
  type PipelineStatus,
} from './lib/pipelineStateMachine';

// ── Debug: list recent orders (internal only) ─────────────

export const listRecentOrders = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const orders = await ctx.db.query('bookOrders').order('desc').take(5);
    return orders.map((o) => ({
      _id: o._id,
      childName: o.childName,
      status: o.status,
      currentAgent: o.currentAgent ?? null,
      error: o.error ?? null,
    }));
  },
});

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
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const from = order.status as PipelineStatus;
    const to = args.status as PipelineStatus;

    if (!shouldUpdateStatus(from, to)) {
      console.log(`[updateOrderStatus] Blocked transition ${from} → ${to} for ${args.orderId}`);
      return null;
    }

    const patch: Record<string, any> = {
      status: to,
      currentAgent: args.currentAgent,
      updatedAt: Date.now(),
    };
    if (args.error !== undefined) {
      patch.error = args.error;
    }
    await ctx.db.patch(args.orderId, patch);
    return null;
  },
});

// ── Complete Track + Check Convergence (atomic) ──────────

/**
 * Shared convergence check used by both `completeTrackAndCheck` (story/image
 * track flags flipped here) and `checkParallelTracksComplete` (caller already
 * patched the flags upstream — e.g. submitStyleVote sets `chosenStyle` and
 * `imageTrackDone` in the same mutation, then schedules this).
 *
 * `POST_CONVERGENCE_STATUSES` guard makes the call idempotent — both helpers
 * can fire for the same order without double-scheduling A7.
 */
async function maybeScheduleIllustrate(ctx: MutationCtx, orderId: Id<'bookOrders'>): Promise<void> {
  const order = await ctx.db.get(orderId);
  if (!order) return;
  if (POST_CONVERGENCE_STATUSES.has(order.status as PipelineStatus)) return;

  const storyDone = order.storyTrackDone ?? !!order.illustrationPlan;
  const imageDone = order.imageTrackDone ?? !!order.chosenStyle;

  if (storyDone && imageDone) {
    await ctx.db.patch(orderId, { status: 'illustrating', updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.bookAgents.illustrate, { orderId });
  }
}

export const completeTrackAndCheck = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    track: v.union(v.literal('story'), v.literal('image')),
  },
  returns: v.null(),
  handler: async (ctx, { orderId, track }) => {
    const field = track === 'story' ? 'storyTrackDone' : 'imageTrackDone';
    await ctx.db.patch(orderId, { [field]: true, updatedAt: Date.now() });
    await maybeScheduleIllustrate(ctx, orderId);
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

// ── LLM Call Budget ──────────────────────────────────────────
// Max LLM + image gen calls per order before auto-failing.

const MAX_LLM_CALLS_PER_ORDER = 50;

export const incrementLlmCallCount = internalMutation({
  args: { orderId: v.id('bookOrders') },
  returns: v.object({ count: v.number(), exceeded: v.boolean() }),
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) return { count: 0, exceeded: true };
    const count = (order.llmCallCount || 0) + 1;
    await ctx.db.patch(orderId, { llmCallCount: count, updatedAt: Date.now() });
    return { count, exceeded: count > MAX_LLM_CALLS_PER_ORDER };
  },
});

// ── Cancel Order ─────────────────────────────────────────────
// Allows admin to stop a running pipeline by marking it as failed.

export const cancelOrder = internalMutation({
  args: { orderId: v.id('bookOrders'), reason: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { orderId, reason }) => {
    const order = await ctx.db.get(orderId);
    if (
      !order ||
      order.status === 'completed' ||
      order.status === 'failed' ||
      order.status === 'paused'
    )
      return null;
    await ctx.db.patch(orderId, {
      status: 'paused',
      error: reason || 'Paused by admin',
      updatedAt: Date.now(),
    });
    await ctx.db.insert('bookPipelineEvents', {
      orderId,
      agent: order.currentAgent || '?',
      event: 'info',
      narrative: `Pipeline wstrzymany: ${reason || 'zatrzymany przez admina'}`,
      timestamp: Date.now(),
    });
    return null;
  },
});

// ── Delete illustrations for an order (cleanup before retry) ─

export const deleteIllustrationsForOrder = internalMutation({
  args: { orderId: v.id('bookOrders') },
  returns: v.number(),
  handler: async (ctx, { orderId }) => {
    const illustrations = await ctx.db
      .query('bookIllustrations')
      .withIndex('by_order', (q) => q.eq('orderId', orderId))
      .take(100);
    for (const ill of illustrations) {
      await ctx.storage.delete(ill.storageId);
      await ctx.db.delete(ill._id);
    }
    return illustrations.length;
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

// ── Update Preview PDF Storage ID ──────────────────────────

export const updatePreviewPdfStorageId = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    previewPdfStorageId: v.id('_storage'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      previewPdfStorageId: args.previewPdfStorageId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ── Update R2 keys (typst-render service path) ──────────────

export const updateR2Keys = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    r2FullKey: v.string(),
    r2PreviewKey: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: { r2FullKey: string; r2PreviewKey?: string; updatedAt: number } = {
      r2FullKey: args.r2FullKey,
      updatedAt: Date.now(),
    };
    if (args.r2PreviewKey !== undefined) patch.r2PreviewKey = args.r2PreviewKey;
    await ctx.db.patch(args.orderId, patch);
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
      status: 'completed',
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
    await maybeScheduleIllustrate(ctx, orderId);
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

// ── Auto-resolve Style Votes (Cron) ──────────────────────
// Orders waiting for style vote for 15+ minutes get auto-resolved to Style A.
// Also catches orders stuck due to A5/A6 race condition (status art_direction
// but style vote images ready and no chosenStyle).

const STYLE_VOTE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

async function autoResolveOrder(ctx: MutationCtx, order: { _id: Id<'bookOrders'> }) {
  const now = Date.now();
  console.warn(`[autoResolveStyleVotes] Order ${order._id} — defaulting to Style A`);
  await ctx.db.insert('bookPipelineEvents', {
    orderId: order._id,
    agent: 'A6b',
    event: 'info',
    narrative: 'Czas na wybór stylu minął — wybieram automatycznie styl A',
    timestamp: now,
  });
  await ctx.db.patch(order._id, { chosenStyle: 'A', imageTrackDone: true, updatedAt: now });
  await ctx.db.insert('bookPipelineEvents', {
    orderId: order._id,
    agent: 'A6b',
    event: 'complete',
    narrative: getNarrative('A6b', 'complete'),
    timestamp: now,
  });
  // Reuse existing merge logic (checks both tracks + guards against double-schedule)
  await ctx.scheduler.runAfter(0, internal.bookPipelineHelpers.checkParallelTracksComplete, {
    orderId: order._id,
  });
}

export const autoResolveStyleVotes = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const cutoff = Date.now() - STYLE_VOTE_TIMEOUT_MS;

    // 1. Normal case: orders explicitly waiting for style_vote
    const voteOrders = await ctx.db
      .query('bookOrders')
      .withIndex('by_status', (q) => q.eq('status', 'style_vote'))
      .take(50);

    for (const order of voteOrders) {
      const orderTime = order.updatedAt || order.createdAt;
      if (orderTime >= cutoff || order.chosenStyle) continue;
      await autoResolveOrder(ctx, order);
    }

    // 2. Race condition case: A5 overwrote style_vote with art_direction,
    //    but A6 already generated vote images. Resolve if stuck 15+ min.
    const artOrders = await ctx.db
      .query('bookOrders')
      .withIndex('by_status', (q) => q.eq('status', 'art_direction'))
      .take(50);

    for (const order of artOrders) {
      const orderTime = order.updatedAt || order.createdAt;
      if (orderTime >= cutoff || order.chosenStyle) continue;
      if (!order.styleVoteImageA || !order.styleVoteImageB) continue;
      await autoResolveOrder(ctx, order);
    }

    return null;
  },
});
