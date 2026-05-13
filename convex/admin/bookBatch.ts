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
      skipQaReviews: v.boolean(),
      format: v.union(v.literal('pdf'), v.literal('pdf_print'), v.null()),
      paymentStatus: v.union(
        v.literal('pending'),
        v.literal('completed'),
        v.literal('failed'),
        v.null(),
      ),
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
      skipQaReviews: o.skipQaReviews ?? false,
      format: o.format ?? null,
      paymentStatus: o.paymentStatus ?? null,
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
  skipQaReviews: v.optional(v.boolean()),
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
      skipQaReviews: profile.skipQaReviews ?? false,
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
      skipQaReviews: order.skipQaReviews ?? false,
      llmCallCount: order.llmCallCount ?? null,
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
      r2FullKey: order.r2FullKey ?? null,
      r2PreviewKey: order.r2PreviewKey ?? null,
    };
  },
});

// ── Retry order from specific agent ──────────────────────────

// Required upstream artifacts per agent
const AGENT_REQUIRED_ARTIFACTS: Record<string, string[]> = {
  A0: [],
  A1: ['orderData'],
  A2: ['orderData', 'characterProfile'],
  A3: ['storyBlueprint', 'characterProfile'],
  A4: ['storyDraft', 'storyBlueprint', 'orderData', 'characterProfile'],
  A5: ['storyDraft', 'characterProfile', 'storyBlueprint'],
  A6: ['characterProfile'],
  A7: ['illustrationPlan', 'characterProfile'],
  A8: ['illustrationPlan', 'characterProfile'],
  A9: ['storyDraft'],
  A10: ['storyDraft', 'characterProfile', 'illustrationPlan'],
  A11: [],
};

// Agents at or after A7 that benefit from illustration cleanup
const ILLUSTRATION_CLEANUP_AGENTS = new Set(['A7', 'A8', 'A9', 'A10']);

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

    // Validate required upstream artifacts exist
    const required = AGENT_REQUIRED_ARTIFACTS[agent] ?? [];
    const orderRecord = order as Record<string, unknown>;
    const missing = required.filter((field) => !orderRecord[field]);
    if (missing.length > 0) {
      throw new Error(
        `Cannot retry from ${agent}: missing upstream artifacts [${missing.join(', ')}]. ` +
          `Retry from an earlier stage to regenerate them.`,
      );
    }

    // Clean up illustrations when retrying from A7+ to prevent duplicates
    if (ILLUSTRATION_CLEANUP_AGENTS.has(agent)) {
      const deleted = await ctx.runMutation(
        internal.bookPipelineHelpers.deleteIllustrationsForOrder,
        { orderId },
      );
      if (deleted > 0) {
        console.log(`[retryOrder] Cleaned ${deleted} illustrations before retry from ${agent}`);
      }
    }

    // Atomic: reset status + audit in one transaction
    await ctx.runMutation(internal.admin.bookBatch.resetOrderForRetry, {
      orderId,
      status: mapping.status,
      currentAgent: mapping.agent,
      actor: subject,
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

// ── Regenerate PDF for an existing order ─────────────────────

export const regeneratePdf = action({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    const { subject } = await assertAdmin(ctx);

    const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
    if (!order) throw new Error('Order not found');
    if (!order.storyDraft) throw new Error('Cannot regenerate PDF — no story draft');

    // Reset to composing_pdf and schedule A9
    await ctx.runMutation(internal.admin.bookBatch.resetOrderForRetry, {
      orderId,
      status: 'composing_pdf',
      currentAgent: 'A9',
      actor: subject,
      fromAgent: 'A9',
    });

    await ctx.scheduler.runAfter(0, internal.bookAgents.composePdf, { orderId });
    return null;
  },
});

// ── DTP Lab: experimental render ──────────────────────────────
// Builds a brief with the requested experimental flags, calls typst-render
// directly, stores the result under experiments/<orderId>/<timestamp>.pdf
// in R2 and returns a presigned URL. Crucially: does NOT touch the order's
// r2FullKey/r2PreviewKey, so the production PDF the parent eventually
// downloads is left exactly as the pipeline produced it.

const EXPERIMENT_PREFIX = 'experiments';

export const composeExperimentalPdf = action({
  args: {
    orderId: v.id('bookOrders'),
    options: v.object({
      // Typography
      dropCaps: v.optional(v.boolean()),
      widerMargins: v.optional(v.boolean()),
      looseLineGap: v.optional(v.boolean()),
      noPageNumbers: v.optional(v.boolean()),
      // Color (manual override or auto-from-category)
      themeColor: v.optional(v.string()),
      bgTitleOverride: v.optional(v.string()),
      ornament: v.optional(v.string()),
      autoCategoryTheme: v.optional(v.boolean()),
      // Sequence
      singleBlankAfterCover: v.optional(v.boolean()),
      removeKoniecSentinel: v.optional(v.boolean()),
      chapterHeaders: v.optional(v.boolean()),
      // Imposition
      printFormat: v.optional(v.union(v.literal('booklet'), v.literal('single'))),
    }),
  },
  returns: v.object({
    outputKey: v.string(),
    presignedUrl: v.string(),
    pages: v.number(),
    sizeKb: v.number(),
    durationMs: v.number(),
  }),
  handler: async (ctx, { orderId, options }) => {
    await assertAdmin(ctx);

    const renderUrl = process.env.RENDER_SERVICE_URL;
    const renderSecret = process.env.RENDER_SHARED_SECRET;
    if (!renderUrl || !renderSecret) {
      throw new Error('RENDER_SERVICE_URL or RENDER_SHARED_SECRET missing');
    }

    const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
    if (!order?.storyDraft) throw new Error('Order has no storyDraft — cannot compose');

    const illustrations = await ctx.runQuery(internal.bookPipelineHelpers.getIllustrations, {
      orderId,
    });
    const briefIllustrations = await Promise.all(
      illustrations.map(async (i) => {
        const url = await ctx.storage.getUrl(i.storageId);
        if (!url) throw new Error(`Illustration ${i.illustrationId} has no URL`);
        return { illustrationId: i.illustrationId, url };
      }),
    );

    const { buildRenderBrief } = await import('../lib/buildRenderBrief');
    const { categoryThemeFor } = await import('../../src/lib/bookData');
    const ts = Date.now();
    const outputKey = `${EXPERIMENT_PREFIX}/${orderId}/${ts}.pdf`;

    // Resolve theme: explicit themeColor wins; fallback to auto-from-category.
    let resolvedThemeColor = options.themeColor;
    let resolvedBg = options.bgTitleOverride;
    let resolvedOrnament = options.ornament;
    let categoryTagline: string | undefined;
    if (options.autoCategoryTheme && !resolvedThemeColor) {
      const theme = categoryThemeFor(order.problemId);
      if (theme) {
        resolvedThemeColor = theme.color;
        resolvedBg = resolvedBg ?? theme.bgTitle;
        resolvedOrnament = resolvedOrnament ?? theme.ornament;
        categoryTagline = theme.tagline;
      }
    }

    const brief = buildRenderBrief({
      jobId: `exp-${orderId}-${ts}`,
      mode: 'full',
      order,
      illustrations: briefIllustrations,
      outputKey,
      force: true,
      experimental: {
        dropCaps: options.dropCaps,
        widerMargins: options.widerMargins,
        looseLineGap: options.looseLineGap,
        noPageNumbers: options.noPageNumbers,
        themeColor: resolvedThemeColor,
        bgTitleOverride: resolvedBg,
        ornament: resolvedOrnament,
        categoryTagline,
        singleBlankAfterCover: options.singleBlankAfterCover,
        removeKoniecSentinel: options.removeKoniecSentinel,
        chapterHeaders: options.chapterHeaders,
        printFormat: options.printFormat,
      },
    });

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 120_000);
    let result: { outputKey: string; sizeBytes: number; pages: number; durationMs: number };
    try {
      const res = await fetch(`${renderUrl.replace(/\/$/, '')}/render`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${renderSecret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(brief),
        signal: ac.signal,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`render ${res.status}: ${txt.slice(0, 500)}`);
      }
      result = await res.json();
    } finally {
      clearTimeout(timer);
    }

    const { presignR2GetUrl } = await import('../lib/r2Presign');
    const presignedUrl = await presignR2GetUrl(result.outputKey);

    return {
      outputKey: result.outputKey,
      presignedUrl,
      pages: result.pages,
      sizeKb: Math.round(result.sizeBytes / 1024),
      durationMs: result.durationMs,
    };
  },
});

// ── Resolve admin download URL ──────────────────────────────
// Mirrors public resolveR2DownloadUrl but without ownership check —
// admins can download any order's PDF. Falls back to Convex storage
// for orders predating the typst-render path (pdfStorageId only).

export const resolveDownloadUrl = action({
  args: {
    orderId: v.id('bookOrders'),
    kind: v.optional(v.union(v.literal('full'), v.literal('preview'))),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { orderId, kind }): Promise<string | null> => {
    await assertAdmin(ctx);
    const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
    if (!order) return null;

    const which = kind ?? 'full';
    const { presignR2GetUrl, r2KeyFor, bookPdfFilename } = await import('../lib/r2Presign');
    const r2Key = r2KeyFor(order, which);
    if (r2Key) return presignR2GetUrl(r2Key, undefined, bookPdfFilename(order, which));

    // Legacy fallback — orders composed via the in-Convex pdfkit path.
    const storageId = which === 'preview' ? order.previewPdfStorageId : order.pdfStorageId;
    return storageId ? await ctx.storage.getUrl(storageId) : null;
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

// Atomic: reset order status + audit log in one transaction
export const resetOrderForRetry = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    status: v.string(),
    currentAgent: v.string(),
    actor: v.string(),
    fromAgent: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const preForkAgents = new Set(['A0', 'A1']);
    const trackReset = preForkAgents.has(args.fromAgent)
      ? { storyTrackDone: false, imageTrackDone: false }
      : {};
    await ctx.db.patch(args.orderId, {
      status: args.status as 'intake',
      // Validator at this layer accepts any string; the schema's union of
      // agent literals is the runtime gate. Cast keeps the patch typed.
      currentAgent: args.currentAgent as 'A0',
      error: '',
      updatedAt: Date.now(),
      ...trackReset,
    });
    await auditLog(ctx, args.actor, 'bookBatch.retry', args.orderId, {
      fromAgent: args.fromAgent,
    });
    return null;
  },
});
