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
    .index('by_created', ['createdAt']),

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
  }).index('by_created', ['createdAt']),

  // ============================================
  // Book Pipeline (Bajkot)
  // ============================================

  bookOrders: defineTable({
    clerkUserId: v.string(),

    // Order form data
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
      v.literal('composing_pdf'),
      v.literal('final_qa'),
      v.literal('delivering'),
      v.literal('completed'),
      v.literal('failed'),
    ),
    currentAgent: v.optional(v.string()),
    error: v.optional(v.string()),
    retryCount: v.optional(v.number()),
    visualQaRetryCount: v.optional(v.number()),

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

    // Final output
    pdfStorageId: v.optional(v.id('_storage')),
    downloadUrl: v.optional(v.string()),

    // Payment
    paymentStatus: v.optional(
      v.union(v.literal('pending'), v.literal('completed'), v.literal('failed')),
    ),
    stripeSessionId: v.optional(v.string()),

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
};

export default defineSchema({
  ...applicationTables,
});
