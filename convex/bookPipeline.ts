/**
 * Public API for the book pipeline.
 * Entry points: startOrder, getOrderProgress, getStyleVoteImages, submitStyleVote, getDownloadUrl
 */

import { action, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { ConvexError, v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { assertOrderOwner, assertLandingOrder, LANDING_USER_ID } from './lib/roles';
import { toAgeBracket, type AgeBracket } from './lib/ageBracket';
import { sanitizeUserText, sanitizeRequiredUserText } from './lib/security';
import { generateLandingAccessToken, sha256Hex } from './lib/landingToken';
import {
  buildConsentsRecord,
  consentsArgsValidator,
  consentRecordStoreValidator,
} from './lib/consents';

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

/** Best-effort extraction of the generated book title from storyDraft JSON. */
function extractBookTitle(storyDraft: string | null | undefined): string | null {
  if (!storyDraft) return null;
  try {
    const parsed: unknown = JSON.parse(storyDraft);
    if (parsed && typeof parsed === 'object' && 'title' in parsed) {
      const title = (parsed as { title?: unknown }).title;
      if (typeof title === 'string' && title.trim().length > 0) return title.trim();
    }
  } catch {
    // ignore parse failures — title is optional
  }
  return null;
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

/**
 * Pull all parent-supplied text fields through the prompt-injection
 * sanitiser. Length caps mirror `validateOrderInput` (which has already run).
 */
function sanitizeOrderTextFields<
  T extends {
    childName: string;
    problemDetail?: string;
    favoriteToy?: string;
  },
>(args: T): T {
  return {
    ...args,
    childName: sanitizeRequiredUserText(args.childName, 30),
    problemDetail: sanitizeUserText(args.problemDetail, 500),
    favoriteToy: sanitizeUserText(args.favoriteToy, 100),
  };
}

/**
 * Run the two pre-pipeline LLM guards (moderation + debrand) before we
 * accept the order into the pipeline. Moderation rejects throw — the
 * frontend catches `Error.message` and surfaces it as the inline form
 * error so the parent can fix the offending field and retry. Debrand is
 * non-blocking: it rewrites `outfit` / `favoriteToy` in place because
 * the image generator's brand filter would otherwise reject the prompts.
 */
async function runIntakeGuards(
  ctx: import('./_generated/server').ActionCtx,
  args: {
    clerkUserId: string;
    childName: string;
    problemDetail?: string;
    favoriteToy?: string;
    outfit: string;
  },
): Promise<{ outfit: string; favoriteToy?: string }> {
  const verdict = await ctx.runAction(internal.bookIntakeGuard.moderateIntake, {
    clerkUserId: args.clerkUserId,
    childName: args.childName,
    problemDetail: args.problemDetail,
    favoriteToy: args.favoriteToy,
    outfit: args.outfit,
  });
  if (!verdict.ok) {
    // Throw ConvexError, not Error — plain Error.message gets sanitized to
    // "Server Error" by Convex before reaching the client. The parent needs
    // to see *which* field tripped moderation so they can fix it.
    throw new ConvexError(
      verdict.reason ?? 'Treść zamówienia nie przeszła moderacji — popraw pola i spróbuj ponownie.',
    );
  }

  return ctx.runAction(internal.bookIntakeGuard.debrandVisualFields, {
    clerkUserId: args.clerkUserId,
    outfit: args.outfit,
    favoriteToy: args.favoriteToy,
  });
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
    skinTone: v.optional(v.string()),
    outfit: v.string(),
    email: v.optional(v.string()),
    format: v.optional(formatValidator),
    shippingAddress: v.optional(shippingAddressValidator),
    consents: consentsArgsValidator,
  },
  returns: v.object({ orderId: v.id('bookOrders') }),
  handler: async (ctx, args): Promise<{ orderId: Id<'bookOrders'> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const clerkUserId = identity.subject;

    const consents = buildConsentsRecord(args.consents);

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
    const cleaned = sanitizeOrderTextFields(args);

    // Pre-pipeline guards: block disallowed content before we burn money on
    // A0-A11, and rewrite brand/IP references in visual fields so the image
    // generator's brand filter doesn't reject the prompts downstream.
    const guarded = await runIntakeGuards(ctx, {
      clerkUserId,
      childName: cleaned.childName,
      problemDetail: cleaned.problemDetail,
      favoriteToy: cleaned.favoriteToy,
      outfit: args.outfit,
    });

    // Create order in DB
    const orderId: Id<'bookOrders'> = await ctx.runMutation(internal.bookPipeline.createOrder, {
      clerkUserId,
      childName: cleaned.childName,
      ageBracket,
      ageNumber: args.ageNumber,
      gender: args.gender,
      problemId: args.problemId,
      problemDetail: cleaned.problemDetail,
      favoriteToy: guarded.favoriteToy,
      glasses: args.glasses,
      hairColor: args.hairColor,
      hairStyle: args.hairStyle,
      eyeColor: args.eyeColor,
      skinTone: args.skinTone,
      outfit: guarded.outfit,
      email: args.email,
      format,
      shippingAddress: format === 'pdf_print' ? args.shippingAddress : undefined,
      consents,
      // Auth flow runs same FAST default as landing: skip QA passes for
      // speed/cost, but keep real Gemini image gen. Admin batch / CLI
      // override on internal paths when full QA is wanted.
      skipQaReviews: true,
    });

    // Schedule A0 (intake) — both PDF and PDF+Print run the same pipeline.
    // Physical print fulfillment is triggered by Stripe webhook (admin alert
    // email after payment confirms format === 'pdf_print').
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
    skinTone: v.optional(v.string()),
    outfit: v.string(),
    email: v.optional(v.string()),
    format: v.optional(formatValidator),
    shippingAddress: v.optional(shippingAddressValidator),
    /** GDPR consent log — required for new orders; optional only for CLI/admin batch. */
    consents: v.optional(consentRecordStoreValidator),
    /** Per-order landing access token (sha256 hex). Only set for landing orders. */
    accessTokenHash: v.optional(v.string()),
    /** Raw landing token (capability) — embedded in transactional email URLs. */
    accessTokenRaw: v.optional(v.string()),
    /**
     * Pipeline behavior toggles — internal-only, never accepted from public
     * actions (C1). Trusted callers (startLandingOrder, CLI, admin batch)
     * pre-set them to optimize for cost/speed vs. quality.
     */
    skipQaReviews: v.optional(v.boolean()),
    fastImage: v.optional(v.boolean()),
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
      format: args.format,
      shippingAddress: args.shippingAddress,
      consents: args.consents,
      accessTokenHash: args.accessTokenHash,
      accessTokenRaw: args.accessTokenRaw,
      skipQaReviews: args.skipQaReviews,
      fastImage: args.fastImage,
      status: 'intake',
      createdAt: Date.now(),
    });

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
    childName: v.string(),
    ageNumber: v.union(v.number(), v.null()),
    problemId: v.string(),
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
      childName: order.childName,
      ageNumber: order.ageNumber ?? null,
      problemId: order.problemId,
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
  if (raw.trim().length === 0) throw new Error('Dedykacja nie może być pusta');
  if (raw.trim().length > DEDICATION_MAX)
    throw new Error(`Dedykacja może mieć maksymalnie ${DEDICATION_MAX} znaków`);
  // Defang prompt-injection patterns — the dedication ends up on the title
  // page next to the child's name and could otherwise carry instructions
  // through any LLM that re-reads the order.
  const cleaned = sanitizeRequiredUserText(raw, DEDICATION_MAX);
  if (cleaned.length === 0) throw new Error('Dedykacja nie może być pusta');
  return cleaned;
}

function assertDedicationWindow(order: {
  chosenStyle?: 'A' | 'B' | null;
  pdfStorageId?: Id<'_storage'>;
}) {
  if (!order.chosenStyle) throw new Error('Najpierw wybierz styl ilustracji');
  if (order.pdfStorageId) throw new Error('Bajka już została złożona');
}

/**
 * Patch the dedication onto the order, mark the dedication step as decided,
 * and — if the composer was waiting on us — kick it off now. The composer
 * sets `status='awaiting_dedication'` when it reaches A9 before the parent
 * has chosen, then idles until this mutation flips the flag.
 */
async function applyDedicationDecision(
  ctx: import('./_generated/server').MutationCtx,
  orderId: Id<'bookOrders'>,
  patch: { parentDedication?: string },
): Promise<void> {
  const before = await ctx.db.get(orderId);
  await ctx.db.patch(orderId, {
    ...patch,
    dedicationDecided: true,
    updatedAt: Date.now(),
  });
  if (before?.status === 'awaiting_dedication') {
    await ctx.scheduler.runAfter(0, internal.bookAgents.composePdf, { orderId });
  }
}

/**
 * Auto-skip dedication for orders that sat in `awaiting_dedication` past the
 * grace window — e.g. parent closed the tab and never came back. Scheduled
 * by composePdf when it parks an order. Idempotent: no-ops if the parent
 * already decided or the order moved past awaiting_dedication on its own.
 */
export const autoSkipStaleDedication = internalMutation({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) return null;
    if (order.dedicationDecided) return null;
    if (order.status !== 'awaiting_dedication') return null;
    await ctx.db.patch(orderId, { dedicationDecided: true, updatedAt: Date.now() });
    await ctx.runMutation(internal.bookPipelineEvents.recordEvent, {
      orderId,
      agent: 'A8',
      event: 'info',
      narrative: 'Auto-skip dedykacji po 5 minutach bez decyzji rodzica.',
    });
    await ctx.scheduler.runAfter(0, internal.bookAgents.composePdf, { orderId });
    return null;
  },
});

export const submitParentDedication = mutation({
  args: { orderId: v.id('bookOrders'), dedication: v.string() },
  returns: v.null(),
  handler: async (ctx, { orderId, dedication }) => {
    const order = await assertOrderOwner(ctx, orderId);
    assertDedicationWindow(order);
    await applyDedicationDecision(ctx, orderId, {
      parentDedication: normalizeDedication(dedication),
    });
    return null;
  },
});

export const submitLandingParentDedication = mutation({
  args: { orderId: v.id('bookOrders'), accessToken: v.string(), dedication: v.string() },
  returns: v.null(),
  handler: async (ctx, { orderId, accessToken, dedication }) => {
    const order = await assertLandingOrder(ctx, orderId, accessToken);
    assertDedicationWindow(order);
    await applyDedicationDecision(ctx, orderId, {
      parentDedication: normalizeDedication(dedication),
    });
    return null;
  },
});

export const skipParentDedication = mutation({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    const order = await assertOrderOwner(ctx, orderId);
    assertDedicationWindow(order);
    await applyDedicationDecision(ctx, orderId, {});
    return null;
  },
});

export const skipLandingParentDedication = mutation({
  args: { orderId: v.id('bookOrders'), accessToken: v.string() },
  returns: v.null(),
  handler: async (ctx, { orderId, accessToken }) => {
    const order = await assertLandingOrder(ctx, orderId, accessToken);
    assertDedicationWindow(order);
    await applyDedicationDecision(ctx, orderId, {});
    return null;
  },
});

// ── Payment status helpers (shared by preview + download) ─

const paymentStatusReturnValidator = v.union(
  v.literal('pending'),
  v.literal('completed'),
  v.literal('failed'),
  v.null(),
);

/**
 * Download URL is gated by paymentStatus — only the Stripe webhook flips
 * this to 'completed'. Internal test orders (CLI, admin batch) bypass
 * payment by setting paymentStatus='completed' directly at insert time;
 * no separate client-controlled bypass flag is honored.
 */
function isPaid(order: { paymentStatus?: string }): boolean {
  return order.paymentStatus === 'completed';
}

// ── Preview (pre-payment) ──────────────────────────────────

const PREVIEW_ILLUSTRATION_IDS = ['cover', 'scene_1', 'scene_2'];

interface PreviewResult {
  childName: string;
  bookTitle: string | null;
  paid: boolean;
  hasPdf: boolean;
  paymentStatus: 'pending' | 'completed' | 'failed' | null;
  /** Topic the order targets — drives category-level conversion analytics. */
  problemId: string;
  /** 'pdf' or 'pdf_print' — drives the unlock CTA price (29 vs 49 PLN) + shipping copy. */
  format: 'pdf' | 'pdf_print';
  illustrations: Array<{ illustrationId: string; url: string | null }>;
  excerptPl: string | null;
  /**
   * URL to the 3-page preview PDF embedded in the result-page flipbook.
   * Null for legacy orders whose composer ran before the preview was added —
   * the frontend falls back to the cover/scene illustration grid.
   */
  previewPdfUrl: string | null;
  /** Set when the typst-render path produced a preview — frontend resolves to a presigned R2 URL. */
  r2PreviewKey: string | null;
}

const previewReturnValidator = v.object({
  childName: v.string(),
  bookTitle: v.union(v.string(), v.null()),
  paid: v.boolean(),
  hasPdf: v.boolean(),
  paymentStatus: paymentStatusReturnValidator,
  /** Topic the order targets — drives category-level conversion analytics. */
  problemId: v.string(),
  format: v.union(v.literal('pdf'), v.literal('pdf_print')),
  illustrations: v.array(
    v.object({ illustrationId: v.string(), url: v.union(v.string(), v.null()) }),
  ),
  excerptPl: v.union(v.string(), v.null()),
  previewPdfUrl: v.union(v.string(), v.null()),
  r2PreviewKey: v.union(v.string(), v.null()),
});

/**
 * Pull the first beat's text out of a stored storyDraft JSON. Truncated to
 * roughly the first paragraph so the result page can tease the prose
 * without giving away the whole book before payment.
 */
function extractFirstBeatExcerpt(storyDraft: string | null | undefined): string | null {
  if (!storyDraft) return null;
  try {
    const parsed = JSON.parse(storyDraft) as { pages?: Array<{ text?: string }> };
    const firstPage = parsed.pages?.find((p) => typeof p.text === 'string' && p.text.trim());
    if (!firstPage?.text) return null;
    const trimmed = firstPage.text.trim();
    if (trimmed.length <= 360) return trimmed;
    // Stop at the last sentence boundary inside the cap so we don't end on a
    // half-finished thought.
    const sliced = trimmed.slice(0, 360);
    const lastStop = Math.max(sliced.lastIndexOf('. '), sliced.lastIndexOf('! '));
    return (lastStop > 200 ? sliced.slice(0, lastStop + 1) : sliced) + '…';
  } catch {
    return null;
  }
}

async function buildPreviewResult(
  ctx: import('./_generated/server').QueryCtx,
  order: {
    childName: string;
    storyDraft?: string;
    paymentStatus?: 'pending' | 'completed' | 'failed';
    pdfStorageId?: Id<'_storage'>;
    previewPdfStorageId?: Id<'_storage'>;
    r2FullKey?: string;
    r2PreviewKey?: string;
    format?: 'pdf' | 'pdf_print';
    problemId: string;
    _id: Id<'bookOrders'>;
  },
): Promise<PreviewResult> {
  const illustrations = await ctx.db
    .query('bookIllustrations')
    .withIndex('by_order', (q) => q.eq('orderId', order._id))
    .collect();
  const byId = new Map(illustrations.map((i) => [i.illustrationId, i]));
  const previewIllustrations = await Promise.all(
    PREVIEW_ILLUSTRATION_IDS.map(async (id) => {
      const ill = byId.get(id);
      const url = ill ? await ctx.storage.getUrl(ill.storageId) : null;
      return { illustrationId: id, url };
    }),
  );
  const previewPdfUrl = order.previewPdfStorageId
    ? await ctx.storage.getUrl(order.previewPdfStorageId)
    : null;
  return {
    childName: order.childName,
    bookTitle: extractBookTitle(order.storyDraft) ?? null,
    paid: isPaid(order),
    hasPdf: !!order.pdfStorageId || !!order.r2FullKey,
    paymentStatus: order.paymentStatus ?? null,
    problemId: order.problemId,
    format: order.format ?? 'pdf',
    illustrations: previewIllustrations,
    excerptPl: extractFirstBeatExcerpt(order.storyDraft),
    previewPdfUrl,
    r2PreviewKey: order.r2PreviewKey ?? null,
  };
}

export const getOrderPreview = query({
  args: { orderId: v.id('bookOrders') },
  returns: previewReturnValidator,
  handler: async (ctx, { orderId }) => {
    const order = await assertOrderOwner(ctx, orderId);
    return buildPreviewResult(ctx, order);
  },
});

export const getLandingOrderPreview = query({
  args: { orderId: v.id('bookOrders'), accessToken: v.string() },
  returns: previewReturnValidator,
  handler: async (ctx, { orderId, accessToken }) => {
    const order = await assertLandingOrder(ctx, orderId, accessToken);
    return buildPreviewResult(ctx, order);
  },
});

// ── Get download URL ───────────────────────────────────────

const downloadUrlReturnValidator = v.object({
  url: v.union(v.string(), v.null()),
  childName: v.string(),
  bookTitle: v.union(v.string(), v.null()),
  paymentStatus: paymentStatusReturnValidator,
  paid: v.boolean(),
  hasPdf: v.boolean(),
  /** Topic the order targets — drives category-level conversion analytics. */
  problemId: v.string(),
  /** Order's chosen format — drives result-page copy + print upsell branch. */
  format: v.union(v.literal('pdf'), v.literal('pdf_print')),
  /** Shipping address for pdf_print orders. Null when format='pdf' or unset. */
  shippingAddress: v.union(shippingAddressValidator, v.null()),
  /** When set, frontend should call resolveR2DownloadUrl action for the R2 path. */
  r2FullKey: v.union(v.string(), v.null()),
});

export const getDownloadUrl = query({
  args: { orderId: v.id('bookOrders') },
  returns: downloadUrlReturnValidator,
  handler: async (ctx, { orderId }) => {
    const order = await assertOrderOwner(ctx, orderId);
    const paid = isPaid(order);
    const url = paid && order.pdfStorageId ? await ctx.storage.getUrl(order.pdfStorageId) : null;
    return {
      url,
      childName: order.childName,
      bookTitle: extractBookTitle(order.storyDraft) ?? null,
      paymentStatus: order.paymentStatus ?? null,
      paid,
      hasPdf: !!order.pdfStorageId || !!order.r2FullKey,
      problemId: order.problemId,
      format: order.format ?? 'pdf',
      shippingAddress: order.shippingAddress ?? null,
      r2FullKey: paid && order.r2FullKey ? order.r2FullKey : null,
    };
  },
});

// Presigned R2 URL for the typst-render service path. Frontend calls this after
// getDownloadUrl reports r2FullKey != null. Preview URL is paywall-free; full
// URL requires payment + ownership.
async function presignForOrder(
  ctx: import('./_generated/server').ActionCtx,
  orderId: Id<'bookOrders'>,
  kind: 'full' | 'preview',
  isAllowedOwner: (clerkUserId: string) => boolean,
): Promise<string | null> {
  const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
  if (!order || !isAllowedOwner(order.clerkUserId)) return null;
  if (kind === 'full') {
    if ((order.paymentStatus ?? null) !== 'completed') return null;
  }
  const { presignR2GetUrl, r2KeyFor, bookPdfFilename } = await import('./lib/r2Presign');
  const key = r2KeyFor(order, kind);
  if (!key) return null;
  return presignR2GetUrl(key, undefined, bookPdfFilename(order, kind));
}

export const resolveR2DownloadUrl = action({
  args: {
    orderId: v.id('bookOrders'),
    kind: v.optional(v.union(v.literal('full'), v.literal('preview'))),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { orderId, kind }): Promise<string | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return presignForOrder(ctx, orderId, kind ?? 'full', (uid) => uid === identity.subject);
  },
});

export const resolveLandingR2DownloadUrl = action({
  args: {
    orderId: v.id('bookOrders'),
    accessToken: v.string(),
    kind: v.optional(v.union(v.literal('full'), v.literal('preview'))),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { orderId, accessToken, kind }): Promise<string | null> => {
    // Validate the per-order landing token before presigning — the URL is a
    // capability, so we treat resolution as a sensitive landing read.
    const ok = await ctx.runQuery(internal.bookPipeline.verifyLandingTokenInternal, {
      orderId,
      accessToken,
    });
    if (!ok) return null;
    return presignForOrder(ctx, orderId, kind ?? 'full', (uid) => uid === LANDING_USER_ID);
  },
});

/** Internal helper so action callers can verify the landing token via DB. */
export const verifyLandingTokenInternal = internalQuery({
  args: { orderId: v.id('bookOrders'), accessToken: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { orderId, accessToken }) => {
    try {
      await assertLandingOrder(ctx, orderId, accessToken);
      return true;
    } catch {
      return false;
    }
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
    skinTone: v.optional(v.string()),
    outfit: v.string(),
    email: v.optional(v.string()),
    format: v.optional(formatValidator),
    shippingAddress: v.optional(shippingAddressValidator),
    consents: consentsArgsValidator,
  },
  returns: v.object({ orderId: v.id('bookOrders'), accessToken: v.string() }),
  handler: async (ctx, args): Promise<{ orderId: Id<'bookOrders'>; accessToken: string }> => {
    const consents = buildConsentsRecord(args.consents);
    // C3 intentionally disabled — env-token gate locked legit visitors out
    // (Convex sanitizes `throw new Error()` to "Server Error" in prod) and
    // the global rate limit's 10/hour cap chokes any real traffic spike.
    // `args.accessToken` is kept on the contract for backward compatibility
    // but no longer validated. `checkAndRecordLandingStart` mutation stays
    // in the codebase so re-enabling is a one-line revert once we have a
    // proper UX (ConvexError + frontend handling + magic-link recovery)
    // and a non-global rate-limit key.
    // Defence remains via: per-order tokens (C2) on every read/write,
    // C1 bypass-flag removal, and the Stripe paywall on PDF unlock.
    void args.accessToken;

    validateOrderInput(args);
    const cleaned = sanitizeOrderTextFields(args);

    const ageBracket = deriveAgeBracket({
      ageBracket: args.ageBracket,
      ageNumber: args.ageNumber,
    });
    const format = args.format ?? 'pdf';

    // Same guards as the auth flow — moderation blocks disallowed content,
    // debrand rewrites trademark references in visual fields.
    const guarded = await runIntakeGuards(ctx, {
      clerkUserId: LANDING_USER_ID,
      childName: cleaned.childName,
      problemDetail: cleaned.problemDetail,
      favoriteToy: cleaned.favoriteToy,
      outfit: args.outfit,
    });

    // Per-order access token. Raw token is returned to the caller once and
    // every subsequent landing call requires it. Only the hash is persisted.
    const rawToken = generateLandingAccessToken();
    const accessTokenHash = await sha256Hex(rawToken);

    const orderId: Id<'bookOrders'> = await ctx.runMutation(internal.bookPipeline.createOrder, {
      clerkUserId: LANDING_USER_ID,
      childName: cleaned.childName,
      ageBracket,
      ageNumber: args.ageNumber,
      gender: args.gender,
      problemId: args.problemId,
      problemDetail: cleaned.problemDetail,
      favoriteToy: guarded.favoriteToy,
      glasses: args.glasses,
      hairColor: args.hairColor,
      hairStyle: args.hairStyle,
      eyeColor: args.eyeColor,
      skinTone: args.skinTone,
      outfit: guarded.outfit,
      email: args.email,
      format,
      shippingAddress: format === 'pdf_print' ? args.shippingAddress : undefined,
      consents,
      accessTokenHash,
      accessTokenRaw: rawToken,
      // Landing flow is the conversion funnel — skip QA passes (A4/A6 etc.)
      // for speed and cost. `fastImage` stays off: that flag swaps Gemini
      // for an ASCII raster (admin-only smoke test path), not what real
      // users should ever see. Trusted server default; clients never touch
      // these flags.
      skipQaReviews: true,
    });

    await ctx.scheduler.runAfter(0, internal.bookAgents.intake, { orderId });
    return { orderId, accessToken: rawToken };
  },
});

export const getLandingOrderProgress = query({
  args: { orderId: v.id('bookOrders'), accessToken: v.string() },
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
    childName: v.string(),
    ageNumber: v.union(v.number(), v.null()),
    problemId: v.string(),
  }),
  handler: async (ctx, { orderId, accessToken }) => {
    const order = await assertLandingOrder(ctx, orderId, accessToken);

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
      childName: order.childName,
      ageNumber: order.ageNumber ?? null,
      problemId: order.problemId,
    };
  },
});

export const getLandingOrderEvents = query({
  args: { orderId: v.id('bookOrders'), accessToken: v.string() },
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
  handler: async (ctx, { orderId, accessToken }) => {
    await assertLandingOrder(ctx, orderId, accessToken);

    const events = await ctx.db
      .query('bookPipelineEvents')
      .withIndex('by_order', (q) => q.eq('orderId', orderId))
      .collect();
    events.sort((a, b) => a.timestamp - b.timestamp);
    return events;
  },
});

export const getLandingDownloadUrl = query({
  args: { orderId: v.id('bookOrders'), accessToken: v.string() },
  returns: downloadUrlReturnValidator,
  handler: async (ctx, { orderId, accessToken }) => {
    const order = await assertLandingOrder(ctx, orderId, accessToken);
    const paid = isPaid(order);
    const url = paid && order.pdfStorageId ? await ctx.storage.getUrl(order.pdfStorageId) : null;
    return {
      url,
      childName: order.childName,
      bookTitle: extractBookTitle(order.storyDraft) ?? null,
      paymentStatus: order.paymentStatus ?? null,
      paid,
      hasPdf: !!order.pdfStorageId || !!order.r2FullKey,
      problemId: order.problemId,
      format: order.format ?? 'pdf',
      shippingAddress: order.shippingAddress ?? null,
      r2FullKey: paid && order.r2FullKey ? order.r2FullKey : null,
    };
  },
});

export const submitLandingStyleVote = mutation({
  args: {
    orderId: v.id('bookOrders'),
    accessToken: v.string(),
    choice: v.union(v.literal('A'), v.literal('B')),
  },
  returns: v.null(),
  handler: async (ctx, { orderId, accessToken, choice }) => {
    const order = await assertLandingOrder(ctx, orderId, accessToken);
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
  args: { orderId: v.id('bookOrders'), accessToken: v.string() },
  returns: v.object({
    imageUrlA: v.union(v.string(), v.null()),
    imageUrlB: v.union(v.string(), v.null()),
    status: v.string(),
    chosenStyle: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, { orderId, accessToken }) => {
    const order = await assertLandingOrder(ctx, orderId, accessToken);

    let imageUrlA: string | null = null;
    let imageUrlB: string | null = null;
    if (order.styleVoteImageA) imageUrlA = await ctx.storage.getUrl(order.styleVoteImageA);
    if (order.styleVoteImageB) imageUrlB = await ctx.storage.getUrl(order.styleVoteImageB);

    return { imageUrlA, imageUrlB, status: order.status, chosenStyle: order.chosenStyle ?? null };
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
