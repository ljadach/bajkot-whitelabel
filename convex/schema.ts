import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const applicationTables = {
  config: defineTable({
    type: v.string(),
    key: v.string(),
    value: v.string(),
  }).index('by_key', ['key']),

  // Rate limiting counters (sliding window)
  rateLimits: defineTable({
    clerkUserId: v.string(),
    actionType: v.string(), // 'llm_call', etc.
    calls: v.array(v.number()), // Timestamps of recent calls
    windowStart: v.number(),
  }).index('by_clerk_user_action', ['clerkUserId', 'actionType']),

  // LLM debug logs
  llmLogs: defineTable({
    clerkUserId: v.optional(v.string()),
    sessionId: v.optional(v.string()), // Legacy
    action: v.string(),
    model: v.string(),
    systemPrompt: v.string(),
    userPrompt: v.string(),
    response: v.optional(v.string()),
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    webSearchUsed: v.optional(v.boolean()),
    webSearchSources: v.optional(v.array(v.string())),
    reasoningUsed: v.optional(v.boolean()),
    finishReason: v.optional(v.string()), // e.g. "stop", "length", "content-filter"
    safetyBlockReason: v.optional(v.string()), // Gemini promptFeedback.blockReason
    retryCount: v.optional(v.number()),
    traceId: v.optional(v.string()), // Langfuse trace ID for cross-system correlation
    timestamp: v.number(),
  }).index('by_clerk_user', ['clerkUserId']),

  // Backend debug logs
  backendLogs: defineTable({
    level: v.union(v.literal('log'), v.literal('warn'), v.literal('error')),
    source: v.string(),
    message: v.string(),
    data: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index('by_timestamp', ['timestamp'])
    .index('by_level', ['level']),

  // ============================================
  // Admin
  // ============================================

  adminConfig: defineTable({
    key: v.string(),
    value: v.string(),
    updatedBy: v.string(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),

  adminAuditLog: defineTable({
    actor: v.string(),
    action: v.string(),
    target: v.optional(v.string()),
    details: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index('by_actor', ['actor'])
    .index('by_timestamp', ['timestamp']),

  // ============================================
  // Lead Capture
  // ============================================

  leads: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    organization: v.string(),
    role: v.string(),
    message: v.optional(v.string()),
    segment: v.union(v.literal('business'), v.literal('edu'), v.literal('executive')),
    language: v.string(),
    createdAt: v.number(),
  })
    .index('by_segment', ['segment'])
    .index('by_created', ['createdAt'])
    // Compound index for per-email rate limit checks — without this, the
    // `by_created` index + `.filter(eq(email))` does a full window scan.
    .index('by_email_and_created', ['email', 'createdAt']),

  // ============================================
  // Contact Form
  // ============================================

  contactSubmissions: defineTable({
    name: v.string(),
    email: v.string(),
    inquiryType: v.union(
      v.literal('enterprise_sales'),
      v.literal('technical_support'),
      v.literal('partnerships'),
      v.literal('press_media'),
      v.literal('general'),
    ),
    question: v.string(),
    language: v.string(),
    createdAt: v.number(),
  })
    .index('by_created', ['createdAt'])
    .index('by_email_and_created', ['email', 'createdAt']),

  // ============================================
  // Book Pipeline (Bajkoterapia)
  // ============================================

  bookOrders: defineTable({
    clerkUserId: v.string(),

    // Order form data
    childName: v.string(),
    // Concrete age (3-16). When present it's the source of truth; ageBracket
    // is derived via toAgeBracket(). ageBracket stays required for in-flight
    // orders and admin tooling that reads it directly.
    ageNumber: v.optional(v.number()),
    ageBracket: v.union(v.literal('3-5'), v.literal('6-8'), v.literal('9+')),
    gender: v.union(v.literal('boy'), v.literal('girl')),
    problemId: v.string(),
    problemDetail: v.optional(v.string()),
    favoriteToy: v.optional(v.string()),
    glasses: v.boolean(),
    hairColor: v.string(),
    hairStyle: v.string(),
    eyeColor: v.string(),
    // Spec section 3.4 dropped skin tone from intake. Kept optional for legacy orders.
    skinTone: v.optional(v.string()),
    outfit: v.string(),
    email: v.optional(v.string()),

    // Fast mode flags (admin batch)
    skipQaReviews: v.optional(v.boolean()),

    // DEV flag: replace Gemini Flash image gen with rasterized ASCII PNG (admin-only).
    // TODO(c3z): pre-launch cleanup — remove this field before launch.
    fastImage: v.optional(v.boolean()),

    // Order format (defaults to 'pdf' if absent for legacy orders).
    // 'pdf_print' is a manual-fulfillment trapdoor: pipeline is paused,
    // staff contacts the customer to arrange the printed book.
    format: v.optional(v.union(v.literal('pdf'), v.literal('pdf_print'))),

    // Shipping address — only present when format === 'pdf_print'.
    shippingAddress: v.optional(
      v.object({
        fullName: v.string(),
        phone: v.string(),
        street: v.string(),
        zip: v.string(),
        city: v.string(),
      }),
    ),

    // DEV flag: bypass Stripe checkout entirely (admin-only).
    // TODO(c3z): pre-launch cleanup — remove this field before launch.
    skipStripe: v.optional(v.boolean()),

    // Parallel track completion (A2-A5 story track, A6-vote image track)
    storyTrackDone: v.optional(v.boolean()),
    imageTrackDone: v.optional(v.boolean()),

    // Pipeline status
    status: v.union(
      v.literal('intake'),
      v.literal('profiling'),
      v.literal('story_planning'),
      v.literal('story_writing'),
      v.literal('psych_review'),
      v.literal('art_direction'),
      v.literal('character_design'),
      v.literal('style_vote'),
      v.literal('illustrating'),
      v.literal('visual_qa'),
      v.literal('awaiting_dedication'),
      v.literal('composing_pdf'),
      v.literal('final_qa'),
      v.literal('delivering'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('paused'),
    ),
    currentAgent: v.optional(
      v.union(
        v.literal('A0'),
        v.literal('A1'),
        v.literal('A2'),
        v.literal('A3'),
        v.literal('A4'),
        v.literal('A5'),
        v.literal('A6'),
        v.literal('A6b'),
        v.literal('A7'),
        v.literal('A8'),
        v.literal('A9'),
        v.literal('A10'),
        v.literal('A11'),
      ),
    ),
    error: v.optional(v.string()),
    retryCount: v.optional(v.number()),
    visualQaRetryCount: v.optional(v.number()),
    llmCallCount: v.optional(v.number()),

    // Artifacts (JSON strings)
    orderData: v.optional(v.string()),
    characterProfile: v.optional(v.string()),
    storyBlueprint: v.optional(v.string()),
    storyDraft: v.optional(v.string()),
    psychReview: v.optional(v.string()),
    illustrationPlan: v.optional(v.string()),
    visualQa: v.optional(v.string()),
    finalQa: v.optional(v.string()),

    // Style vote
    styleVoteImageA: v.optional(v.id('_storage')),
    styleVoteImageB: v.optional(v.id('_storage')),
    chosenStyle: v.optional(v.union(v.literal('A'), v.literal('B'))),

    // Entered by the parent via UI while illustrations are generating.
    // A9 composer and A10 final QA read from here instead of round-tripping
    // through storyDraft (which no longer produces a dedication).
    parentDedication: v.optional(v.string()),

    // Set true once the parent has either submitted or skipped the dedication
    // form. A9 (composePdf) gates on this so the PDF doesn't render before
    // the parent's input lands. Without it the pipeline races ahead and the
    // dedication ends up on a PDF that's already been built (or missed).
    dedicationDecided: v.optional(v.boolean()),

    // Final output — pdfkit path (Convex storage)
    pdfStorageId: v.optional(v.id('_storage')),
    // 3-page teaser PDF embedded in the result-page flipbook so the parent
    // gets a real preview before paying.
    previewPdfStorageId: v.optional(v.id('_storage')),
    downloadUrl: v.optional(v.string()),

    // Final output — typst-render service path (R2). Bucket is private; the
    // raw key is never returned to the frontend, only presigned URLs.
    r2FullKey: v.optional(v.string()),
    r2PreviewKey: v.optional(v.string()),

    // Per-order opt-in for the typst-render path. Wins over env-level
    // USE_RENDER_SERVICE so a single test order can route differently
    // without redeploying.
    useRenderService: v.optional(v.boolean()),

    // Payment
    paymentStatus: v.optional(
      v.union(v.literal('pending'), v.literal('completed'), v.literal('failed')),
    ),
    stripeSessionId: v.optional(v.string()),

    // Per-order landing access token, sha256 hex of the raw token. The raw
    // token is returned to the caller once (on order creation) and required
    // for every subsequent landing read/write. Legacy orders predating this
    // gate have no hash and are rejected by assertLandingOrder.
    accessTokenHash: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index('by_clerk_user', ['clerkUserId'])
    .index('by_status', ['status'])
    .index('by_clerk_user_and_status', ['clerkUserId', 'status']),

  bookIllustrations: defineTable({
    orderId: v.id('bookOrders'),
    illustrationId: v.string(),
    storageId: v.id('_storage'),
    prompt: v.string(),
    width: v.number(),
    height: v.number(),
    sceneRef: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_order', ['orderId'])
    .index('by_order_and_id', ['orderId', 'illustrationId']),

  bookPrompts: defineTable({
    filename: v.string(),
    agentName: v.string(),
    content: v.string(),
    isModified: v.boolean(),
    updatedAt: v.number(),
  }).index('by_filename', ['filename']),

  // Pipeline narrative events (human-readable timeline)
  bookPipelineEvents: defineTable({
    orderId: v.id('bookOrders'),
    agent: v.string(),
    event: v.union(
      v.literal('start'),
      v.literal('complete'),
      v.literal('error'),
      v.literal('retry'),
      v.literal('info'),
    ),
    narrative: v.string(),
    details: v.optional(v.string()),
    // Langfuse trace ID — lets admin debugging join pipeline event ↔ LLM log
    // ↔ Langfuse trace by a single ID. Optional so legacy rows don't break.
    traceId: v.optional(v.string()),
    timestamp: v.number(),
  }).index('by_order', ['orderId']),

  // Prompt version history
  bookPromptVersions: defineTable({
    promptKey: v.string(),
    content: v.string(),
    version: v.number(),
    editedBy: v.string(),
    editedAt: v.number(),
    changeNote: v.optional(v.string()),
  })
    .index('by_prompt_key', ['promptKey'])
    .index('by_prompt_key_version', ['promptKey', 'version']),
};

export default defineSchema({
  ...applicationTables,
});
