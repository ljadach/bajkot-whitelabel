/**
 * Admin batch operations for book pipeline.
 * Allows creating multiple book orders at once with pre-set chosenStyle (skipping user vote).
 */

import { action, internalMutation, query } from '../_generated/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';
import { Id } from '../_generated/dataModel';
import { assertAdmin } from '../lib/roles';
import { assertBulkLimit, auditLog } from '../lib/adminGuards';

// ── Pipeline stats (admin dashboard) ─────────────────────────

export const getPipelineStats = query({
  args: {},
  returns: v.object({
    totalOrders: v.number(),
    completedOrders: v.number(),
    failedOrders: v.number(),
    inProgressOrders: v.number(),
    avgCompletionTimeMs: v.union(v.number(), v.null()),
    successRate: v.number(),
    ordersByStatus: v.any(),
    recentOrders: v.array(
      v.object({
        _id: v.id('bookOrders'),
        childName: v.string(),
        status: v.string(),
        currentAgent: v.union(v.string(), v.null()),
        createdAt: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
    await assertAdmin(ctx);

    const allOrders = await ctx.db.query('bookOrders').order('desc').take(500);

    const totalOrders = allOrders.length;

    const ordersByStatus: Record<string, number> = {};
    let completedOrders = 0;
    let failedOrders = 0;
    let inProgressOrders = 0;
    let totalCompletionTime = 0;
    let completionCount = 0;

    for (const order of allOrders) {
      // Count by status
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;

      if (order.status === 'completed') {
        completedOrders++;
        if (order.completedAt) {
          totalCompletionTime += order.completedAt - order.createdAt;
          completionCount++;
        }
      } else if (order.status === 'failed') {
        failedOrders++;
      } else {
        inProgressOrders++;
      }
    }

    const avgCompletionTimeMs = completionCount > 0 ? totalCompletionTime / completionCount : null;
    const denominator = completedOrders + failedOrders;
    const successRate = denominator > 0 ? Math.round((completedOrders / denominator) * 100) : 0;

    // Recent 10 orders
    const recentOrders = allOrders.slice(0, 10).map((o) => ({
      _id: o._id,
      childName: o.childName,
      status: o.status,
      currentAgent: o.currentAgent ?? null,
      createdAt: o.createdAt,
    }));

    return {
      totalOrders,
      completedOrders,
      failedOrders,
      inProgressOrders,
      avgCompletionTimeMs,
      successRate,
      ordersByStatus,
      recentOrders,
    };
  },
});

// ── List all book orders (admin view) ────────────────────────

export const listOrders = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('bookOrders'),
      childName: v.string(),
      status: v.string(),
      currentAgent: v.union(v.string(), v.null()),
      error: v.union(v.string(), v.null()),
      chosenStyle: v.union(v.string(), v.null()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await assertAdmin(ctx);

    const orders = await ctx.db.query('bookOrders').order('desc').take(200);

    return orders.map((o) => ({
      _id: o._id,
      childName: o.childName,
      status: o.status,
      currentAgent: o.currentAgent ?? null,
      error: o.error ?? null,
      chosenStyle: o.chosenStyle ?? null,
      createdAt: o.createdAt,
    }));
  },
});

// ── Internal mutation to create a single batch order ─────────

const batchOrderProfileValidator = v.object({
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
  chosenStyle: v.optional(v.union(v.literal('A'), v.literal('B'))),
});

export const createBatchOrder = internalMutation({
  args: {
    clerkUserId: v.string(),
    profile: batchOrderProfileValidator,
  },
  returns: v.id('bookOrders'),
  handler: async (ctx, { clerkUserId, profile }) => {
    const orderId = await ctx.db.insert('bookOrders', {
      clerkUserId,
      childName: profile.childName,
      ageBracket: profile.ageBracket,
      gender: profile.gender,
      problemId: profile.problemId,
      problemDetail: profile.problemDetail,
      favoriteToy: profile.favoriteToy,
      glasses: profile.glasses,
      hairColor: profile.hairColor,
      hairStyle: profile.hairStyle,
      eyeColor: profile.eyeColor,
      skinTone: profile.skinTone,
      outfit: profile.outfit,
      email: profile.email,
      chosenStyle: profile.chosenStyle ?? 'A',
      status: 'intake',
      createdAt: Date.now(),
    });

    await auditLog(ctx, clerkUserId, 'bookBatch.create', orderId, {
      childName: profile.childName,
      chosenStyle: profile.chosenStyle ?? 'A',
    });

    return orderId;
  },
});

// ── Batch create action ──────────────────────────────────────

export const batchCreate = action({
  args: {
    orders: v.array(batchOrderProfileValidator),
  },
  returns: v.object({
    created: v.array(v.id('bookOrders')),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, { orders }) => {
    const { subject } = await assertAdmin(ctx);
    assertBulkLimit(orders, 'batch orders');

    const createdIds: Id<'bookOrders'>[] = [];
    const errors: string[] = [];

    for (let i = 0; i < orders.length; i++) {
      const profile = orders[i];
      try {
        const orderId = await ctx.runMutation(internal.admin.bookBatch.createBatchOrder, {
          clerkUserId: subject,
          profile,
        });
        createdIds.push(orderId);

        // Schedule A0 (intake) for this order
        await ctx.scheduler.runAfter(0, internal.bookAgents.intake, { orderId });
      } catch (err) {
        errors.push(
          `#${i} (${profile.childName}): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return { created: createdIds, errors };
  },
});

// ── Get order detail (admin view) ────────────────────────────

const AGENT_STATUS_MAP: Record<string, { status: string; agent: string }> = {
  A0: { status: 'intake', agent: 'A0' },
  A1: { status: 'profiling', agent: 'A1' },
  A2: { status: 'story_planning', agent: 'A2' },
  A3: { status: 'story_writing', agent: 'A3' },
  A4: { status: 'psych_review', agent: 'A4' },
  A5: { status: 'art_direction', agent: 'A5' },
  A6: { status: 'character_design', agent: 'A6' },
  A7: { status: 'illustrating', agent: 'A7' },
  A8: { status: 'visual_qa', agent: 'A8' },
  A9: { status: 'composing_pdf', agent: 'A9' },
  A10: { status: 'final_qa', agent: 'A10' },
  A11: { status: 'delivering', agent: 'A11' },
};

export const getOrderDetail = query({
  args: { orderId: v.id('bookOrders') },
  returns: v.any(),
  handler: async (ctx, { orderId }) => {
    await assertAdmin(ctx);

    const order = await ctx.db.get(orderId);
    if (!order) return null;

    // Get illustrations
    const illustrations = await ctx.db
      .query('bookIllustrations')
      .withIndex('by_order', (q) => q.eq('orderId', orderId))
      .collect();

    // Resolve storage URLs for illustrations
    const illustrationUrls = await Promise.all(
      illustrations.map(async (ill) => ({
        illustrationId: ill.illustrationId,
        url: await ctx.storage.getUrl(ill.storageId),
        prompt: ill.prompt,
        width: ill.width,
        height: ill.height,
        sceneRef: ill.sceneRef,
      })),
    );

    // Resolve style vote image URLs
    const styleVoteUrlA = order.styleVoteImageA
      ? await ctx.storage.getUrl(order.styleVoteImageA)
      : null;
    const styleVoteUrlB = order.styleVoteImageB
      ? await ctx.storage.getUrl(order.styleVoteImageB)
      : null;

    // Resolve PDF URL
    const pdfUrl = order.pdfStorageId ? await ctx.storage.getUrl(order.pdfStorageId) : null;

    return {
      _id: order._id,
      childName: order.childName,
      ageBracket: order.ageBracket,
      gender: order.gender,
      problemId: order.problemId,
      status: order.status,
      currentAgent: order.currentAgent ?? null,
      error: order.error ?? null,
      chosenStyle: order.chosenStyle ?? null,
      retryCount: order.retryCount ?? 0,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt ?? null,
      completedAt: order.completedAt ?? null,
      // Artifacts
      orderData: order.orderData ?? null,
      characterProfile: order.characterProfile ?? null,
      storyBlueprint: order.storyBlueprint ?? null,
      storyDraft: order.storyDraft ?? null,
      psychReview: order.psychReview ?? null,
      illustrationPlan: order.illustrationPlan ?? null,
      visualQa: order.visualQa ?? null,
      finalQa: order.finalQa ?? null,
      // Media
      illustrationUrls,
      styleVoteUrlA,
      styleVoteUrlB,
      pdfUrl,
    };
  },
});

// ── Retry order from specific agent ──────────────────────────

export const retryOrder = action({
  args: {
    orderId: v.id('bookOrders'),
    fromAgent: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { orderId, fromAgent }) => {
    const { subject } = await assertAdmin(ctx);

    const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
    if (!order) throw new Error('Order not found');

    const agent = fromAgent ?? order.currentAgent ?? 'A0';
    const mapping = AGENT_STATUS_MAP[agent];
    if (!mapping) throw new Error(`Unknown agent: ${agent}`);

    // Clear error, set status to the agent's step
    await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
      orderId,
      status: mapping.status,
      currentAgent: mapping.agent,
      error: '',
    });

    await ctx.runMutation(internal.admin.bookBatch.auditRetry, {
      actor: subject,
      orderId,
      fromAgent: agent,
    });

    // Agent function map
    const agentFunctions: Record<string, any> = {
      A0: internal.bookAgents.intake,
      A1: internal.bookAgents.profileChild,
      A2: internal.bookAgents.planStory,
      A3: internal.bookAgents.writeStory,
      A4: internal.bookAgents.reviewPsych,
      A5: internal.bookAgents.directArt,
      A6: internal.bookAgents.designCharacter,
      A7: internal.bookAgents.illustrate,
      A8: internal.bookAgents.reviewVisual,
      A9: internal.bookAgents.composePdf,
      A10: internal.bookAgents.reviewFinal,
      A11: internal.bookAgents.deliver,
    };

    const fn = agentFunctions[agent];
    if (!fn) throw new Error(`No function for agent: ${agent}`);

    await ctx.scheduler.runAfter(0, fn, { orderId });
    return null;
  },
});

// ── Cancel a running order ──────────────────────────────────

export const cancelOrder = action({
  args: {
    orderId: v.id('bookOrders'),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { orderId, reason }) => {
    await assertAdmin(ctx);
    await ctx.runMutation(internal.bookPipelineHelpers.cancelOrder, {
      orderId,
      reason: reason || 'Cancelled by admin',
    });
    return null;
  },
});

export const auditRetry = internalMutation({
  args: {
    actor: v.string(),
    orderId: v.id('bookOrders'),
    fromAgent: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { actor, orderId, fromAgent }) => {
    await auditLog(ctx, actor, 'bookBatch.retry', orderId, { fromAgent });
    return null;
  },
});
