/**
 * Internal functions exposed for CLI usage.
 * These bypass Clerk auth — meant for local development/testing only.
 * Called via: npx convex run cli:<functionName> '{"arg": "value"}'
 */

import { internalAction, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

// ── Create order (bypasses Clerk auth + rate limiting) ───────

export const createOrder = internalMutation({
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
    chosenStyle: v.optional(v.union(v.literal('A'), v.literal('B'))),
    skipQaReviews: v.optional(v.boolean()),
  },
  returns: v.id('bookOrders'),
  handler: async (ctx, args) => {
    const orderId = await ctx.db.insert('bookOrders', {
      clerkUserId: 'cli-user',
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
      chosenStyle: args.chosenStyle ?? 'A',
      skipQaReviews: args.skipQaReviews ?? true,
      status: 'intake',
      createdAt: Date.now(),
    });
    return orderId;
  },
});

// ── Start pipeline for an order ──────────────────────────────

export const startPipeline = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    await ctx.scheduler.runAfter(0, internal.bookAgents.intake, { orderId });
    return null;
  },
});

// ── List orders (no auth) ────────────────────────────────────

export const listOrders = internalQuery({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { limit, status }) => {
    const take = limit ?? 20;

    if (status) {
      const orders = await ctx.db
        .query('bookOrders')
        .withIndex('by_status', (q) => q.eq('status', status as any))
        .order('desc')
        .take(take);
      return orders.map(summarize);
    }

    const orders = await ctx.db.query('bookOrders').order('desc').take(take);
    return orders.map(summarize);
  },
});

function summarize(o: any) {
  return {
    _id: o._id,
    childName: o.childName,
    status: o.status,
    currentAgent: o.currentAgent ?? null,
    error: o.error ?? null,
    chosenStyle: o.chosenStyle ?? null,
    llmCallCount: o.llmCallCount ?? 0,
    createdAt: o.createdAt,
    completedAt: o.completedAt ?? null,
  };
}

// ── Get order detail (full artifacts) ────────────────────────

export const getOrderDetail = internalQuery({
  args: { orderId: v.id('bookOrders') },
  returns: v.any(),
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) return null;

    const illustrations = await ctx.db
      .query('bookIllustrations')
      .withIndex('by_order', (q) => q.eq('orderId', orderId))
      .collect();

    const illustrationUrls = await Promise.all(
      illustrations.map(async (ill) => ({
        illustrationId: ill.illustrationId,
        url: await ctx.storage.getUrl(ill.storageId),
        prompt: ill.prompt,
        sceneRef: ill.sceneRef,
      })),
    );

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
      skipQaReviews: order.skipQaReviews ?? false,
      llmCallCount: order.llmCallCount ?? 0,
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
      pdfUrl,
    };
  },
});

// ── Get pipeline events (timeline) ───────────────────────────

export const getOrderEvents = internalQuery({
  args: { orderId: v.id('bookOrders') },
  returns: v.any(),
  handler: async (ctx, { orderId }) => {
    const events = await ctx.db
      .query('bookPipelineEvents')
      .withIndex('by_order', (q) => q.eq('orderId', orderId))
      .collect();

    events.sort((a, b) => a.timestamp - b.timestamp);
    return events;
  },
});

// ── Get LLM logs for a user (default: cli-user) ─────────────

export const getLlmLogs = internalQuery({
  args: {
    clerkUserId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, { clerkUserId, limit }) => {
    const userId = clerkUserId ?? 'cli-user';
    const take = limit ?? 50;

    const logs = await ctx.db
      .query('llmLogs')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', userId))
      .order('desc')
      .take(take);

    return logs;
  },
});

// ── List users who have LLM logs ─────────────────────────────

export const getLlmLogUsers = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const allLogs = await ctx.db.query('llmLogs').collect();
    const userMap = new Map<string, { count: number; last: number }>();

    for (const log of allLogs) {
      if (!log.clerkUserId) continue;
      const existing = userMap.get(log.clerkUserId);
      if (existing) {
        existing.count++;
        existing.last = Math.max(existing.last, log.timestamp);
      } else {
        userMap.set(log.clerkUserId, { count: 1, last: log.timestamp });
      }
    }

    return Array.from(userMap.entries())
      .map(([id, { count, last }]) => ({ clerkUserId: id, count, lastActivity: last }))
      .sort((a, b) => b.lastActivity - a.lastActivity);
  },
});

// ── Get pipeline stats ───────────────────────────────────────

export const getPipelineStats = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const allOrders = await ctx.db.query('bookOrders').order('desc').take(500);

    const byStatus: Record<string, number> = {};
    let completed = 0;
    let failed = 0;
    let inProgress = 0;
    let totalTime = 0;
    let completionCount = 0;

    for (const o of allOrders) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      if (o.status === 'completed') {
        completed++;
        if (o.completedAt) {
          totalTime += o.completedAt - o.createdAt;
          completionCount++;
        }
      } else if (o.status === 'failed') {
        failed++;
      } else {
        inProgress++;
      }
    }

    return {
      total: allOrders.length,
      completed,
      failed,
      inProgress,
      avgTimeMs: completionCount > 0 ? Math.round(totalTime / completionCount) : null,
      successRate:
        completed + failed > 0 ? Math.round((completed / (completed + failed)) * 100) : 0,
      byStatus,
    };
  },
});

// ── Get download URL for order ───────────────────────────────

export const getDownloadUrl = internalQuery({
  args: { orderId: v.id('bookOrders') },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order?.pdfStorageId) return null;
    return await ctx.storage.getUrl(order.pdfStorageId);
  },
});

// ── Prompt management (no auth) ─────────────────────────────

const PROMPT_META: Record<string, { agent: string; filename: string }> = {
  bookIntake: { agent: 'A0 — Intake', filename: 'A0_intake' },
  bookChildProfiler: { agent: 'A1 — Child Profiler', filename: 'A1_child_profiler' },
  bookStoryArchitect: { agent: 'A2 — Story Architect', filename: 'A2_story_architect' },
  bookStoryWriter: { agent: 'A3 — Story Writer', filename: 'A3_story_writer' },
  bookPsychReviewer: { agent: 'A4 — Psych Reviewer', filename: 'A4_psych_reviewer' },
  bookArtDirector: { agent: 'A5 — Art Director', filename: 'A5_art_director' },
  bookCharacterDesigner: { agent: 'A6 — Character Designer', filename: 'A6_character_designer' },
  bookStyleVote: { agent: 'A6b — Style Vote', filename: 'A6b_style_vote' },
  bookIllustrator: { agent: 'A7 — Illustrator', filename: 'A7_illustrator' },
  bookVisualQa: { agent: 'A8 — Visual QA', filename: 'A8_visual_qa' },
  bookComposer: { agent: 'A9 — Composer', filename: 'A9_composer' },
  bookFinalQa: { agent: 'A10 — Final QA', filename: 'A10_final_qa' },
  bookDelivery: { agent: 'A11 — Delivery', filename: 'A11_delivery' },
  bookPipelineIndex: { agent: 'Index', filename: 'index' },
};

export const listPrompts = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const results = [];
    for (const [key, meta] of Object.entries(PROMPT_META)) {
      const entry = await ctx.db
        .query('bookPrompts')
        .withIndex('by_filename', (q) => q.eq('filename', meta.filename))
        .first();

      const versions = await ctx.db
        .query('bookPromptVersions')
        .withIndex('by_prompt_key', (q) => q.eq('promptKey', key))
        .collect();

      results.push({
        key,
        agent: meta.agent,
        filename: meta.filename,
        inDb: !!entry,
        modified: entry?.isModified ?? false,
        contentLength: entry?.content?.length ?? 0,
        versions: versions.length,
        updatedAt: entry?.updatedAt ?? null,
      });
    }
    return results;
  },
});

export const getPromptContent = internalQuery({
  args: { key: v.string() },
  returns: v.any(),
  handler: async (ctx, { key }) => {
    const meta = PROMPT_META[key];
    if (!meta)
      return { error: `Unknown key: ${key}. Valid keys: ${Object.keys(PROMPT_META).join(', ')}` };

    const entry = await ctx.db
      .query('bookPrompts')
      .withIndex('by_filename', (q) => q.eq('filename', meta.filename))
      .first();

    return {
      key,
      agent: meta.agent,
      filename: meta.filename,
      source: entry ? (entry.isModified ? 'db (modified)' : 'db (seeded)') : 'fallback only',
      content: entry?.content ?? null,
      updatedAt: entry?.updatedAt ?? null,
    };
  },
});

export const setPromptContent = internalMutation({
  args: {
    key: v.string(),
    content: v.string(),
    changeNote: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, { key, content, changeNote }) => {
    const meta = PROMPT_META[key];
    if (!meta) return { error: `Unknown key: ${key}` };

    const existing = await ctx.db
      .query('bookPrompts')
      .withIndex('by_filename', (q) => q.eq('filename', meta.filename))
      .first();

    // Save version snapshot before overwriting
    if (existing) {
      const latestVer = await ctx.db
        .query('bookPromptVersions')
        .withIndex('by_prompt_key_version', (q: any) => q.eq('promptKey', key))
        .order('desc')
        .first();
      const nextVersion = latestVer ? latestVer.version + 1 : 1;

      await ctx.db.insert('bookPromptVersions', {
        promptKey: key,
        content: existing.content,
        version: nextVersion,
        editedBy: 'cli-user',
        editedAt: Date.now(),
        changeNote: changeNote ?? 'CLI update',
      });

      await ctx.db.patch(existing._id, {
        content,
        isModified: true,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('bookPrompts', {
        filename: meta.filename,
        agentName: meta.agent,
        content,
        isModified: true,
        updatedAt: Date.now(),
      });
    }

    return { ok: true, key, contentLength: content.length };
  },
});
