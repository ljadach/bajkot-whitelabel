/**
 * Public API for the book pipeline.
 * Entry points: startOrder, getOrderProgress, getStyleVoteImages, submitStyleVote, getDownloadUrl
 */

import { action, internalMutation, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { assertOrderOwner, assertLandingOrder, LANDING_USER_ID } from './lib/roles';
import { toAgeBracket, type AgeBracket } from './lib/ageBracket';

// Schema validators reused across entry-point mutations.
const ageBracketValidator = v.union(v.literal('3-5'), v.literal('6-8'), v.literal('9+'));
const formatValidator = v.union(v.literal('pdf'), v.literal('pdf_print'));
const shippingAddressValidator = v.object({
  fullName: v.string(),
  phone: v.string(),
  street: v.string(),
  zip: v.string(),
  city: v.string(),
});

function deriveAgeBracket(args: { ageBracket?: AgeBracket; ageNumber?: number }): AgeBracket {
  if (typeof args.ageNumber === 'number') return toAgeBracket(args.ageNumber);
  if (args.ageBracket) return args.ageBracket;
  throw new Error('Either ageNumber or ageBracket must be provided');
}

function validateOrderInput(args: {
  childName: string;
  problemDetail?: string;
  favoriteToy?: string;
}) {
  if (args.childName.length < 2 || args.childName.length > 30) {
    throw new Error('childName must be 2-30 characters');
  }
  if (args.problemDetail && args.problemDetail.length > 500) {
    throw new Error('problemDetail must be max 500 characters');
  }
  if (args.favoriteToy && args.favoriteToy.length > 100) {
    throw new Error('favoriteToy must be max 100 characters');
  }
}

// ── Start a new book order ─────────────────────────────────

export const startOrder = action({
  args: {
    childName: v.string(),
    ageBracket: v.optional(ageBracketValidator),
    ageNumber: v.optional(v.number()),
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
    skipQaReviews: v.optional(v.boolean()),
    // DEV: remove these flags before launch.
    // TODO(c3z): pre-launch cleanup
    skipStripe: v.optional(v.boolean()),
    format: v.optional(formatValidator),
    shippingAddress: v.optional(shippingAddressValidator),
  },
  returns: v.object({ orderId: v.id('bookOrders') }),
  handler: async (ctx, args): Promise<{ orderId: Id<'bookOrders'> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const clerkUserId = identity.subject;

    // Only admins can flip dev shortcut flags (skipQa, skipStripe).
    // DEV: remove these flags before launch.
    // TODO(c3z): pre-launch cleanup
    const adminUser = (identity as any).isAdmin === true;
    const skipQaReviews = adminUser ? args.skipQaReviews : undefined;
    const skipStripe = adminUser ? args.skipStripe : undefined;

    const ageBracket = deriveAgeBracket({
      ageBracket: args.ageBracket,
      ageNumber: args.ageNumber,
    });
    const format = args.format ?? 'pdf';

    // Rate limiting
    await ctx.runMutation(internal.rateLimitMutation.checkAndRecordLLMRateLimit, {
      actionType: 'llm_call',
      clerkUserId,
    });

    validateOrderInput(args);

    // Create order in DB
    const orderId: Id<'bookOrders'> = await ctx.runMutation(internal.bookPipeline.createOrder, {
      clerkUserId,
      childName: args.childName,
      ageBracket,
      ageNumber: args.ageNumber,
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
      skipQaReviews,
      skipStripe,
      format,
      shippingAddress: format === 'pdf_print' ? args.shippingAddress : undefined,
      pauseForPrint: format === 'pdf_print',
    });

    // PDF+Print trapdoor: do NOT start the pipeline. Manual contact flow.
    if (format === 'pdf_print') {
      return { orderId };
    }

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
    ageBracket: ageBracketValidator,
    ageNumber: v.optional(v.number()),
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
    skipQaReviews: v.optional(v.boolean()),
    // DEV: remove these flags before launch.
    // TODO(c3z): pre-launch cleanup
    skipStripe: v.optional(v.boolean()),
    format: v.optional(formatValidator),
    shippingAddress: v.optional(shippingAddressValidator),
    /** When true (PDF+Print), order starts in 'paused' instead of 'intake'. */
    pauseForPrint: v.optional(v.boolean()),
  },
  returns: v.id('bookOrders'),
  handler: async (ctx, args) => {
    const orderId = await ctx.db.insert('bookOrders', {
      clerkUserId: args.clerkUserId,
      childName: args.childName,
      ageBracket: args.ageBracket,
      ageNumber: args.ageNumber,
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
      skipQaReviews: args.skipQaReviews,
      skipStripe: args.skipStripe,
      format: args.format,
      shippingAddress: args.shippingAddress,
      status: args.pauseForPrint ? 'paused' : 'intake',
      createdAt: Date.now(),
    });

    // Trapdoor: PDF+Print orders never enter the pipeline. We log a narrative
    // event so admins can find them in the audit timeline.
    if (args.pauseForPrint) {
      await ctx.db.insert('bookPipelineEvents', {
        orderId,
        agent: 'system',
        event: 'info',
        narrative: 'Klient wybrał wersję drukowaną — wymagany kontakt manualny',
        details: JSON.stringify({
          format: args.format,
          shippingAddress: args.shippingAddress,
          email: args.email,
          childName: args.childName,
          problemId: args.problemId,
        }),
        timestamp: Date.now(),
      });
    }

    return orderId;
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
    const order = await assertOrderOwner(ctx, orderId);

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
    chosenStyle: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, { orderId }) => {
    const order = await assertOrderOwner(ctx, orderId);

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
      chosenStyle: order.chosenStyle ?? null,
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
    const order = await assertOrderOwner(ctx, orderId);
    if (order.chosenStyle) return null; // Already chosen (e.g. fast mode) — no-op
    if (!order.styleVoteImageA || !order.styleVoteImageB)
      throw new Error('Style vote images not ready');

    await ctx.db.patch(orderId, {
      chosenStyle: choice,
      imageTrackDone: true,
      updatedAt: Date.now(),
    });

    // imageTrackDone set inline above (atomic with chosenStyle).
    // Actions use completeTrackAndCheck; mutations can patch + schedule directly.
    await ctx.scheduler.runAfter(0, internal.bookPipelineHelpers.checkParallelTracksComplete, {
      orderId,
    });

    return null;
  },
});

// ── Submit parent dedication (after style vote, before composer) ───

const DEDICATION_MAX = 200;

function normalizeDedication(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) throw new Error('Dedykacja nie może być pusta');
  if (trimmed.length > DEDICATION_MAX)
    throw new Error(`Dedykacja może mieć maksymalnie ${DEDICATION_MAX} znaków`);
  return trimmed;
}

function assertDedicationWindow(order: {
  chosenStyle?: 'A' | 'B' | null;
  pdfStorageId?: Id<'_storage'>;
}) {
  if (!order.chosenStyle) throw new Error('Najpierw wybierz styl ilustracji');
  if (order.pdfStorageId) throw new Error('Bajka już została złożona');
}

export const submitParentDedication = mutation({
  args: { orderId: v.id('bookOrders'), dedication: v.string() },
  returns: v.null(),
  handler: async (ctx, { orderId, dedication }) => {
    const order = await assertOrderOwner(ctx, orderId);
    assertDedicationWindow(order);
    await ctx.db.patch(orderId, {
      parentDedication: normalizeDedication(dedication),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const submitLandingParentDedication = mutation({
  args: { orderId: v.id('bookOrders'), dedication: v.string() },
  returns: v.null(),
  handler: async (ctx, { orderId, dedication }) => {
    const order = await assertLandingOrder(ctx, orderId);
    assertDedicationWindow(order);
    await ctx.db.patch(orderId, {
      parentDedication: normalizeDedication(dedication),
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ── Get download URL ───────────────────────────────────────

export const getDownloadUrl = query({
  args: { orderId: v.id('bookOrders') },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { orderId }) => {
    const order = await assertOrderOwner(ctx, orderId);
    if (!order.pdfStorageId) return null;
    return await ctx.storage.getUrl(order.pdfStorageId);
  },
});

// ── Landing page order (no auth, token-gated) ───────────────

export const startLandingOrder = action({
  args: {
    accessToken: v.string(),
    childName: v.string(),
    ageBracket: v.optional(ageBracketValidator),
    ageNumber: v.optional(v.number()),
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
    format: v.optional(formatValidator),
    shippingAddress: v.optional(shippingAddressValidator),
  },
  returns: v.object({ orderId: v.id('bookOrders') }),
  handler: async (ctx, args): Promise<{ orderId: Id<'bookOrders'> }> => {
    // Access token gate disabled — kept for future re-enable
    // const expectedToken = process.env.LANDING_ACCESS_TOKEN;
    // if (!expectedToken || args.accessToken !== expectedToken) {
    //   throw new Error('Invalid access token');
    // }
    void args.accessToken;

    validateOrderInput(args);

    const ageBracket = deriveAgeBracket({
      ageBracket: args.ageBracket,
      ageNumber: args.ageNumber,
    });
    const format = args.format ?? 'pdf';

    const orderId: Id<'bookOrders'> = await ctx.runMutation(internal.bookPipeline.createOrder, {
      clerkUserId: LANDING_USER_ID,
      childName: args.childName,
      ageBracket,
      ageNumber: args.ageNumber,
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
      format,
      shippingAddress: format === 'pdf_print' ? args.shippingAddress : undefined,
      pauseForPrint: format === 'pdf_print',
    });

    if (format === 'pdf_print') {
      return { orderId };
    }

    await ctx.scheduler.runAfter(0, internal.bookAgents.intake, { orderId });
    return { orderId };
  },
});

export const getLandingOrderProgress = query({
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
    const order = await assertLandingOrder(ctx, orderId);

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

export const getLandingOrderEvents = query({
  args: { orderId: v.id('bookOrders') },
  returns: v.array(
    v.object({
      _id: v.id('bookPipelineEvents'),
      _creationTime: v.number(),
      orderId: v.id('bookOrders'),
      agent: v.string(),
      event: v.string(),
      narrative: v.string(),
      details: v.optional(v.string()),
      timestamp: v.number(),
    }),
  ),
  handler: async (ctx, { orderId }) => {
    const order = await assertLandingOrder(ctx, orderId);

    const events = await ctx.db
      .query('bookPipelineEvents')
      .withIndex('by_order', (q) => q.eq('orderId', orderId))
      .collect();
    events.sort((a, b) => a.timestamp - b.timestamp);
    return events;
  },
});

export const getLandingDownloadUrl = query({
  args: { orderId: v.id('bookOrders') },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { orderId }) => {
    const order = await assertLandingOrder(ctx, orderId);
    if (!order.pdfStorageId) return null;
    return await ctx.storage.getUrl(order.pdfStorageId);
  },
});

export const submitLandingStyleVote = mutation({
  args: {
    orderId: v.id('bookOrders'),
    choice: v.union(v.literal('A'), v.literal('B')),
  },
  returns: v.null(),
  handler: async (ctx, { orderId, choice }) => {
    const order = await assertLandingOrder(ctx, orderId);
    if (order.chosenStyle) return null;
    if (!order.styleVoteImageA || !order.styleVoteImageB)
      throw new Error('Style vote images not ready');

    await ctx.db.patch(orderId, {
      chosenStyle: choice,
      imageTrackDone: true,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.bookPipelineHelpers.checkParallelTracksComplete, {
      orderId,
    });
    return null;
  },
});

export const getLandingStyleVoteImages = query({
  args: { orderId: v.id('bookOrders') },
  returns: v.object({
    imageUrlA: v.union(v.string(), v.null()),
    imageUrlB: v.union(v.string(), v.null()),
    status: v.string(),
    chosenStyle: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, { orderId }) => {
    const order = await assertLandingOrder(ctx, orderId);

    let imageUrlA: string | null = null;
    let imageUrlB: string | null = null;
    if (order.styleVoteImageA) imageUrlA = await ctx.storage.getUrl(order.styleVoteImageA);
    if (order.styleVoteImageB) imageUrlB = await ctx.storage.getUrl(order.styleVoteImageB);

    return { imageUrlA, imageUrlB, status: order.status, chosenStyle: order.chosenStyle ?? null };
  },
});

// ── Get user's orders ──────────────────────────────────────

// ── PDF+Print trapdoor — thank you page queries ───────────

const printThanksReturn = v.union(
  v.null(),
  v.object({
    childName: v.string(),
    format: v.string(),
    email: v.union(v.string(), v.null()),
  }),
);

export const getPrintThanksOrder = query({
  args: { orderId: v.id('bookOrders') },
  returns: printThanksReturn,
  handler: async (ctx, { orderId }) => {
    const order = await assertOrderOwner(ctx, orderId);
    if (order.format !== 'pdf_print') return null;
    return {
      childName: order.childName,
      format: order.format,
      email: order.email ?? null,
    };
  },
});

export const getLandingPrintThanksOrder = query({
  args: { orderId: v.id('bookOrders') },
  returns: printThanksReturn,
  handler: async (ctx, { orderId }) => {
    const order = await assertLandingOrder(ctx, orderId);
    if (order.format !== 'pdf_print') return null;
    return {
      childName: order.childName,
      format: order.format,
      email: order.email ?? null,
    };
  },
});

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
