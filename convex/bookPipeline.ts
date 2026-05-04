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
import { sanitizeUserText, sanitizeRequiredUserText } from './lib/security';

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
    skipQaReviews: v.optional(v.boolean()),
    // DEV: remove these flags before launch.
    // TODO(c3z): pre-launch cleanup
    skipStripe: v.optional(v.boolean()),
    fastImage: v.optional(v.boolean()),
    format: v.optional(formatValidator),
    shippingAddress: v.optional(shippingAddressValidator),
  },
  returns: v.object({ orderId: v.id('bookOrders') }),
  handler: async (ctx, args): Promise<{ orderId: Id<'bookOrders'> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const clerkUserId = identity.subject;

    // Only admins can flip dev shortcut flags (skipQa, skipStripe, fastImage).
    // DEV: remove these flags before launch.
    // TODO(c3z): pre-launch cleanup
    const adminUser = (identity as any).isAdmin === true;
    const skipQaReviews = adminUser ? args.skipQaReviews : undefined;
    const skipStripe = adminUser ? args.skipStripe : undefined;
    const fastImage = adminUser ? args.fastImage : undefined;

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

    // Create order in DB
    const orderId: Id<'bookOrders'> = await ctx.runMutation(internal.bookPipeline.createOrder, {
      clerkUserId,
      childName: cleaned.childName,
      ageBracket,
      ageNumber: args.ageNumber,
      gender: args.gender,
      problemId: args.problemId,
      problemDetail: cleaned.problemDetail,
      favoriteToy: cleaned.favoriteToy,
      glasses: args.glasses,
      hairColor: args.hairColor,
      hairStyle: args.hairStyle,
      eyeColor: args.eyeColor,
      skinTone: args.skinTone,
      outfit: args.outfit,
      email: args.email,
      skipQaReviews,
      skipStripe,
      fastImage,
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
    skinTone: v.optional(v.string()),
    outfit: v.string(),
    email: v.optional(v.string()),
    skipQaReviews: v.optional(v.boolean()),
    // DEV: remove these flags before launch.
    // TODO(c3z): pre-launch cleanup
    skipStripe: v.optional(v.boolean()),
    fastImage: v.optional(v.boolean()),
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
      fastImage: args.fastImage,
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
  args: { orderId: v.id('bookOrders'), dedication: v.string() },
  returns: v.null(),
  handler: async (ctx, { orderId, dedication }) => {
    const order = await assertLandingOrder(ctx, orderId);
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
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    const order = await assertLandingOrder(ctx, orderId);
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
 * Download URL is gated by paymentStatus — the preview screen has to lock
 * the PDF until the parent has paid. `skipStripe` (admin shortcut) bypasses
 * the gate so internal test orders still produce a download.
 */
function isPaid(order: { paymentStatus?: string; skipStripe?: boolean }): boolean {
  if (order.skipStripe === true) return true;
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
    skipStripe?: boolean;
    pdfStorageId?: Id<'_storage'>;
    previewPdfStorageId?: Id<'_storage'>;
    r2FullKey?: string;
    r2PreviewKey?: string;
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
  args: { orderId: v.id('bookOrders') },
  returns: previewReturnValidator,
  handler: async (ctx, { orderId }) => {
    const order = await assertLandingOrder(ctx, orderId);
    return buildPreviewResult(ctx, order);
  },
});

// ── Get download URL ───────────────────────────────────────

export const getDownloadUrl = query({
  args: { orderId: v.id('bookOrders') },
  returns: v.object({
    url: v.union(v.string(), v.null()),
    childName: v.string(),
    bookTitle: v.union(v.string(), v.null()),
    paymentStatus: paymentStatusReturnValidator,
    paid: v.boolean(),
    hasPdf: v.boolean(),
    /** When set, frontend should call resolveR2DownloadUrl action for the R2 path. */
    r2FullKey: v.union(v.string(), v.null()),
  }),
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
    const paid = (order.paymentStatus ?? null) === 'completed' || order.skipStripe === true;
    if (!paid) return null;
  }
  const { presignR2GetUrl, r2KeyFor } = await import('./lib/r2Presign');
  const key = r2KeyFor(order, kind);
  if (!key) return null;
  return presignR2GetUrl(key);
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
    kind: v.optional(v.union(v.literal('full'), v.literal('preview'))),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { orderId, kind }): Promise<string | null> =>
    presignForOrder(ctx, orderId, kind ?? 'full', (uid) => uid === LANDING_USER_ID),
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
    // DEV: admin-only shortcuts. Server gates these on the Clerk identity
    // even though the order itself is recorded against LANDING_USER_ID.
    // TODO(c3z): pre-launch cleanup
    skipQaReviews: v.optional(v.boolean()),
    skipStripe: v.optional(v.boolean()),
    fastImage: v.optional(v.boolean()),
  },
  returns: v.object({ orderId: v.id('bookOrders') }),
  handler: async (ctx, args): Promise<{ orderId: Id<'bookOrders'> }> => {
    // Access token gate disabled — kept for future re-enable
    // const expectedToken = process.env.LANDING_ACCESS_TOKEN;
    // if (!expectedToken || args.accessToken !== expectedToken) {
    //   throw new Error('Invalid access token');
    // }
    void args.accessToken;

    // Honor dev shortcut flags only if the caller is signed in as admin.
    // The order is still recorded under LANDING_USER_ID so it stays in the
    // landing flow's data model.
    const identity = await ctx.auth.getUserIdentity();
    const adminUser = identity ? (identity as { isAdmin?: boolean }).isAdmin === true : false;
    const skipQaReviews = adminUser ? args.skipQaReviews : undefined;
    const skipStripe = adminUser ? args.skipStripe : undefined;
    const fastImage = adminUser ? args.fastImage : undefined;

    validateOrderInput(args);
    const cleaned = sanitizeOrderTextFields(args);

    const ageBracket = deriveAgeBracket({
      ageBracket: args.ageBracket,
      ageNumber: args.ageNumber,
    });
    const format = args.format ?? 'pdf';

    const orderId: Id<'bookOrders'> = await ctx.runMutation(internal.bookPipeline.createOrder, {
      clerkUserId: LANDING_USER_ID,
      childName: cleaned.childName,
      ageBracket,
      ageNumber: args.ageNumber,
      gender: args.gender,
      problemId: args.problemId,
      problemDetail: cleaned.problemDetail,
      favoriteToy: cleaned.favoriteToy,
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
      skipQaReviews,
      skipStripe,
      fastImage,
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
    childName: v.string(),
    ageNumber: v.union(v.number(), v.null()),
    problemId: v.string(),
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
      childName: order.childName,
      ageNumber: order.ageNumber ?? null,
      problemId: order.problemId,
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
  returns: v.object({
    url: v.union(v.string(), v.null()),
    childName: v.string(),
    bookTitle: v.union(v.string(), v.null()),
    paymentStatus: paymentStatusReturnValidator,
    paid: v.boolean(),
    hasPdf: v.boolean(),
    r2FullKey: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, { orderId }) => {
    const order = await assertLandingOrder(ctx, orderId);
    const paid = isPaid(order);
    const url = paid && order.pdfStorageId ? await ctx.storage.getUrl(order.pdfStorageId) : null;
    return {
      url,
      childName: order.childName,
      bookTitle: extractBookTitle(order.storyDraft) ?? null,
      paymentStatus: order.paymentStatus ?? null,
      paid,
      hasPdf: !!order.pdfStorageId || !!order.r2FullKey,
      r2FullKey: paid && order.r2FullKey ? order.r2FullKey : null,
    };
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
