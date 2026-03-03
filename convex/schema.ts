import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { chatMessageValidator } from './lib/chatMessage';
import { optionalLanguageCodeValidator } from './lib/languageValidator';

/**
 * @robustness JSON-in-strings debt
 * Pola planOutline, planFull, profileState to JSON strings zamiast typed objects.
 * Tracisz type safety i query możliwości. Migracja: expand-contract pattern.
 * Fix: expand-contract pattern when migrating to typed objects.
 */

const applicationTables = {
  userProfiles: defineTable({
    clerkUserId: v.string(), // Clerk user ID (subject from identity)
    currentStep: v.string(), // "welcome", "chat", "verification", "summary", "assessment", "plan", "coursePreview", "payment", "complete"
    chatHistory: v.array(chatMessageValidator),
    profileXml: v.optional(v.string()), // Canonical XML profile - source of truth
    intakeComplete: v.optional(v.boolean()), // True when LLM signals intake conversation is done
    preferredLanguage: optionalLanguageCodeValidator, // User's preferred language
    // Optional JSON string derived from XML for UI convenience (one-way mapping).
    profileState: v.optional(v.string()),
    skillVerification: v.optional(
      v.object({
        performanceScore: v.number(),
        selfAssessment: v.number(),
        promptText: v.optional(v.string()),
        level: v.optional(v.string()),
        feedback: v.optional(v.string()),
        completedAt: v.optional(v.number()),
        inputType: v.optional(v.string()), // 'prompt' | 'skill'
      })
    ),
    // Inferred AI fluency based on tools, artifacts, paid subscriptions
    inferredAiFluency: v.optional(
      v.object({
        score: v.number(), // 0-100
        justification: v.string(), // Text explanation
        inferredAt: v.number(),
      })
    ),
    trainingOutline: v.optional(
      v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          outcome: v.optional(v.string()), // PRD: What learner will achieve
          description: v.string(),
          time_minutes: v.optional(v.number()), // PRD: Duration in minutes
          // @robustness Legacy field - duration (string) replaced by time_minutes (number)
          // Can be removed after verifying no production data uses this field
          duration: v.optional(v.string()),
          format: v.optional(v.string()), // PRD: video/text/live/interactive
          difficulty: v.string(),
          isQuickWin: v.optional(v.boolean()), // PRD: Quick wins flag
          prereqs: v.optional(v.array(v.string())), // PRD: Prerequisites
          tags: v.optional(v.array(v.string())), // PRD: Tags for categorization
          included: v.boolean(),
        })
      )
    ),
    planOutline: v.optional(v.string()), // JSON string (outline pages)
    planFull: v.optional(v.string()), // JSON string (full playbook blocks)
    planMetadata: v.optional(v.string()),
    planSearchSources: v.optional(v.array(v.string())), // URLs from web search grounding (playbook)
    email: v.optional(v.string()), // For checkout
    paymentStatus: v.optional(v.string()), // "pending", "completed", "failed"
    stripeSessionId: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    assessmentReport: v.optional(v.string()), // Pretty Markdown assessment between summary and plan
    courseDocumentIds: v.optional(v.array(v.id('courseDocuments'))), // Links to generated course handbooks
    // Quick tip with Google Search grounding - shown on plan page
    quickTip: v.optional(
      v.object({
        hook: v.optional(v.string()), // Short catchy headline (1 line teaser)
        content: v.string(), // Full markdown content
        generatedAt: v.number(),
        searchSources: v.optional(v.array(v.string())), // URLs from Google Search
      })
    ),
    // Diary entry — humorous blog-style "future self" post shown on plan page
    diaryEntry: v.optional(
      v.object({
        title: v.string(), // Blog post title
        content: v.string(), // Full markdown content
        generatedAt: v.number(),
      })
    ),
    // Organization membership (Feature 3)
    organizationId: v.optional(v.id('organizations')),
    // Learning statistics (Feature 2)
    learningStats: v.optional(
      v.object({
        totalTimeSpentMinutes: v.number(),
        lastActivityAt: v.number(),
        streakDays: v.number(),
        longestStreak: v.number(),
      })
    ),
    toolPreferences: v.optional(
      v.object({
        glossatorMargin: v.boolean(),
        workbenchTabs: v.boolean(),
        feynmanOracle: v.boolean(),
        chapterProbes: v.boolean(),
        conceptRadar: v.optional(v.boolean()),
        contrapositor: v.optional(v.boolean()),
        explorationPanel: v.optional(v.boolean()),
        skeletonKey: v.optional(v.boolean()),
        tomorrowBriefing: v.optional(v.boolean()),
      })
    ),
  })
    .index('by_clerk_user', ['clerkUserId'])
    .index('by_organization', ['organizationId']),

  // ============================================
  // Courses (multi-course support)
  // ============================================

  // Course = entire learning package (e.g. 6 modules)
  // Naming: Kurs (Course) → Modul (Module = courseDocument) → Lekcja (Lesson = chapter)
  courses: defineTable({
    clerkUserId: v.string(), // Owner of this course
    profileId: v.id('userProfiles'), // Profile that generated this course
    title: v.string(), // Course title
    description: v.optional(v.string()), // Short description
    status: v.union(
      v.literal('draft'), // Being generated
      v.literal('active'), // Ready for learning
      v.literal('completed'), // All modules finished
      v.literal('archived') // Hidden from active view
    ),
    moduleCount: v.number(), // Number of modules (courseDocuments)
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_clerk_user', ['clerkUserId'])
    .index('by_profile', ['profileId'])
    .index('by_clerk_user_and_status', ['clerkUserId', 'status']),

  // Course document handbooks - one per outline page (= module)
  // @robustness imagePlaceholder with 'google-nano-banana' is a mock/placeholder
  // for future image generation. Clean up when implementing real image gen.
  courseDocuments: defineTable({
    clerkUserId: v.string(),
    profileId: v.id('userProfiles'),
    courseId: v.optional(v.id('courses')), // Links module to a course (optional for backward compat)
    pageIndex: v.number(), // 0-based, maps to planOutline array index
    pageTitle: v.string(),
    status: v.union(v.literal('pending'), v.literal('generating'), v.literal('completed'), v.literal('failed')),
    handbook: v.optional(
      v.object({
        chapter1: v.object({
          title: v.string(),
          content: v.string(), // Markdown
          imagePlaceholder: v.optional(
            v.object({
              model: v.literal('google-nano-banana'),
              prompt: v.string(),
              mockUrl: v.string(),
            })
          ),
        }),
        chapter2: v.object({
          title: v.string(),
          content: v.string(),
          imagePlaceholder: v.optional(
            v.object({
              model: v.literal('google-nano-banana'),
              prompt: v.string(),
              mockUrl: v.string(),
            })
          ),
        }),
        chapter3: v.object({
          title: v.string(),
          content: v.string(),
          imagePlaceholder: v.optional(
            v.object({
              model: v.literal('google-nano-banana'),
              prompt: v.string(),
              mockUrl: v.string(),
            })
          ),
        }),
      })
    ),
    error: v.optional(v.string()),
    webSearchSources: v.optional(v.array(v.string())), // URLs from web search grounding
    generatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_profile', ['profileId'])
    .index('by_profile_page', ['profileId', 'pageIndex'])
    .index('by_course', ['courseId'])
    .index('by_course_and_page', ['courseId', 'pageIndex'])
    .index('by_clerk_user', ['clerkUserId']),

  config: defineTable({
    type: v.string(),
    key: v.string(),
    value: v.string(),
  }).index('by_key', ['key']),

  // Session token mapping for URL-based session sharing
  sessionTokens: defineTable({
    clerkUserId: v.string(),
    shareToken: v.string(), // UUID for URL sharing
    createdAt: v.number(),
    expiresAt: v.number(), // 30 days from creation
  })
    .index('by_token', ['shareToken'])
    .index('by_clerk_user', ['clerkUserId'])
    .index('by_expires', ['expiresAt']), // For cleanup cron

  // Rate limiting counters (sliding window)
  // @robustness calls array grows per user. Needs periodic cleanup cron
  // to prune old timestamps outside window. Currently relies on overwrite.
  rateLimits: defineTable({
    clerkUserId: v.string(),
    actionType: v.string(), // 'llm_call', 'profile_update', etc.
    calls: v.array(v.number()), // Timestamps of recent calls
    windowStart: v.number(),
  }).index('by_clerk_user_action', ['clerkUserId', 'actionType']),

  // LLM debug logs for development
  // @robustness Migration in progress: sessionId → clerkUserId
  // Status: EXPAND phase complete. Need to decide: backfill old logs or delete them.
  // Old logs without clerkUserId are orphaned (can't link to user). Consider purging.
  // Legacy field — consider purging orphaned logs without clerkUserId.
  llmLogs: defineTable({
    clerkUserId: v.optional(v.string()), // New Clerk-based user ID
    sessionId: v.optional(v.string()), // Legacy - remove after migration/purge
    action: v.string(), // 'generateNextQuestion', 'scorePrompt', etc.
    model: v.string(),
    systemPrompt: v.string(),
    userPrompt: v.string(),
    response: v.optional(v.string()), // JSON stringified response
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    webSearchUsed: v.optional(v.boolean()),
    webSearchSources: v.optional(v.array(v.string())),
    reasoningUsed: v.optional(v.boolean()),
    timestamp: v.number(),
  }).index('by_clerk_user', ['clerkUserId']),

  // Backend debug logs for development (console.log capture)
  // @robustness No retention policy - table will grow unbounded.
  // Add cleanup cron or TTL-based deletion for production.
  backendLogs: defineTable({
    level: v.union(v.literal('log'), v.literal('warn'), v.literal('error')),
    source: v.string(), // e.g., 'streamQuestion', 'streamParser'
    message: v.string(),
    data: v.optional(v.string()), // JSON stringified extra data
    timestamp: v.number(),
  })
    .index('by_timestamp', ['timestamp'])
    .index('by_level', ['level']),

  // ============================================
  // Interactive Exercises (Feature 1)
  // ============================================

  // Exercise definitions - one per chapter per course document
  exercises: defineTable({
    courseDocumentId: v.id('courseDocuments'),
    courseId: v.optional(v.id('courses')), // Denormalized for efficient course-level queries
    chapterNumber: v.number(), // 1, 2, 3
    exerciseType: v.union(
      v.literal('prompt_improvement'), // Improve a given prompt
      v.literal('problem_solving'), // Solve a problem using AI
      v.literal('reflection') // Reflect on learning
    ),
    prompt: v.string(), // The exercise question/task
    hints: v.optional(v.array(v.string())), // Progressive hints
    maxPoints: v.number(), // Maximum points achievable
    rubric: v.optional(v.string()), // AI evaluation rubric
    createdAt: v.number(),
  })
    .index('by_document_chapter', ['courseDocumentId', 'chapterNumber'])
    .index('by_document', ['courseDocumentId'])
    .index('by_course', ['courseId']),

  // User submissions for exercises
  exerciseSubmissions: defineTable({
    clerkUserId: v.string(),
    exerciseId: v.id('exercises'),
    courseDocumentId: v.id('courseDocuments'),
    courseId: v.optional(v.id('courses')), // Denormalized for efficient course-level queries
    chapterNumber: v.number(),
    submissionText: v.string(), // User's answer
    score: v.number(), // 0-100 normalized score
    feedback: v.string(), // AI-generated feedback
    pointsAwarded: v.number(), // Actual points earned
    submittedAt: v.number(),
    evaluatedAt: v.optional(v.number()),
  })
    .index('by_user', ['clerkUserId'])
    .index('by_user_exercise', ['clerkUserId', 'exerciseId'])
    .index('by_document', ['courseDocumentId'])
    .index('by_user_and_course', ['clerkUserId', 'courseId']),

  // Aggregated user points for gamification
  // When courseId is set, represents per-course points.
  // When courseId is undefined, represents legacy global points.
  userPoints: defineTable({
    clerkUserId: v.string(),
    courseId: v.optional(v.id('courses')), // Per-course points (optional for backward compat)
    totalPoints: v.number(),
    exercisesCompleted: v.number(),
    lastUpdatedAt: v.number(),
  })
    .index('by_clerk_user', ['clerkUserId'])
    .index('by_clerk_user_and_course', ['clerkUserId', 'courseId']),

  // ============================================
  // Progress Tracking (Feature 2)
  // ============================================

  // Chapter-level progress for each course document
  chapterProgress: defineTable({
    clerkUserId: v.string(),
    courseDocumentId: v.id('courseDocuments'),
    courseId: v.optional(v.id('courses')), // Denormalized for efficient course-level queries
    chapterNumber: v.number(), // 1, 2, 3
    status: v.union(v.literal('not_started'), v.literal('in_progress'), v.literal('completed')),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    timeSpentSeconds: v.number(), // Accumulated time
  })
    .index('by_user', ['clerkUserId'])
    .index('by_user_document', ['clerkUserId', 'courseDocumentId'])
    .index('by_user_document_chapter', ['clerkUserId', 'courseDocumentId', 'chapterNumber'])
    .index('by_user_and_course', ['clerkUserId', 'courseId']),

  // Activity log for progress visualization
  // @robustness Append-only log, no retention. Will grow unbounded.
  // Consider: partitioning by month, archiving old entries, or limiting per user.
  activityLog: defineTable({
    clerkUserId: v.string(),
    courseId: v.optional(v.id('courses')), // Scoped to a course (optional for backward compat)
    activityType: v.union(v.literal('chapter_started'), v.literal('chapter_completed'), v.literal('exercise_completed'), v.literal('session_started')),
    referenceId: v.optional(v.string()), // courseDocumentId, exerciseId, etc.
    pointsEarned: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index('by_user', ['clerkUserId'])
    .index('by_user_time', ['clerkUserId', 'timestamp'])
    .index('by_user_and_course', ['clerkUserId', 'courseId']),

  // ============================================
  // Team/Organization Management (Feature 3)
  // ============================================

  // Organizations for team/enterprise features
  organizations: defineTable({
    name: v.string(),
    slug: v.string(), // URL-friendly identifier
    ownerId: v.string(), // clerkUserId of owner
    settings: v.optional(
      v.object({
        allowPublicJoin: v.boolean(),
        maxMembers: v.optional(v.number()),
      })
    ),
    createdAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_owner', ['ownerId']),

  // Organization membership
  organizationMembers: defineTable({
    organizationId: v.id('organizations'),
    clerkUserId: v.string(),
    role: v.union(
      v.literal('admin'), // Full access
      v.literal('manager'), // Can view team progress
      v.literal('member') // Regular learner
    ),
    displayName: v.optional(v.string()),
    joinedAt: v.number(),
    invitedBy: v.optional(v.string()), // clerkUserId of inviter
  })
    .index('by_org', ['organizationId'])
    .index('by_user', ['clerkUserId'])
    .index('by_org_user', ['organizationId', 'clerkUserId']),

  // Pending invitations
  organizationInvites: defineTable({
    organizationId: v.id('organizations'),
    email: v.string(),
    role: v.union(v.literal('manager'), v.literal('member')),
    inviteToken: v.string(), // UUID for invite link
    invitedBy: v.string(), // clerkUserId
    status: v.union(v.literal('pending'), v.literal('accepted'), v.literal('expired')),
    createdAt: v.number(),
    expiresAt: v.number(), // 7 days from creation
  })
    .index('by_org', ['organizationId'])
    .index('by_token', ['inviteToken'])
    .index('by_email', ['email']),

  // ============================================
  // Content Processing Pipeline (Admin)
  // ============================================

  // Admin pipeline configuration (Google Drive URLs, etc.)
  adminConfig: defineTable({
    key: v.string(),
    value: v.string(),
    updatedBy: v.string(), // clerkUserId
    updatedAt: v.number(),
  }).index('by_key', ['key']),

  // Videos tracked from Google Drive, served via Cloudflare Stream
  pipelineVideos: defineTable({
    fileName: v.string(),
    fileHash: v.string(), // hash(name + duration/size) for dedup
    sourceUrl: v.optional(v.string()), // Google Drive URL
    googleDriveFileId: v.optional(v.string()), // GDrive file ID for API access
    durationSeconds: v.optional(v.number()),
    fileSizeBytes: v.optional(v.number()),
    status: v.union(v.literal('new'), v.literal('processing'), v.literal('processed'), v.literal('failed')),
    error: v.optional(v.string()),
    toolDetected: v.optional(v.string()), // AI tool shown in the video (e.g. "Gemini", "ChatGPT")
    uiVersion: v.optional(v.string()), // UI version description detected by LLM
    // Cloudflare Stream fields — populated during processVideo
    cloudflareStreamUid: v.optional(v.string()), // Cloudflare Stream video UID
    cloudflareError: v.optional(v.string()), // Error from last CF upload attempt
    addedBy: v.string(), // clerkUserId
    processedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_hash', ['fileHash'])
    .index('by_status', ['status']),

  // Video segments — individual timestamped chunks from LLM analysis
  videoSegments: defineTable({
    videoId: v.id('pipelineVideos'),
    startSeconds: v.number(),
    endSeconds: v.number(),
    description: v.string(), // What happens in this segment
    metadata: v.optional(v.string()), // JSON: clicks, UI elements, etc.
    enabled: v.boolean(), // Toggle on/off for corpus inclusion
    tags: v.array(v.string()), // redacted, check_again, unsure, custom
    order: v.number(), // Sort order within video
    createdAt: v.number(),
  })
    .index('by_video', ['videoId'])
    .index('by_video_order', ['videoId', 'order']),

  // Knowledge corpora — versioned merged collections of segments
  knowledgeCorpora: defineTable({
    version: v.number(),
    name: v.string(), // e.g. "Corpus v3 — 2026-02-06"
    videoIds: v.array(v.id('pipelineVideos')),
    tagFilter: v.object({
      mode: v.union(v.literal('include'), v.literal('exclude')),
      tags: v.array(v.string()),
    }),
    segmentCount: v.number(),
    content: v.string(), // Merged text corpus (YAML-like, for backward compat)
    segments: v.optional(v.string()), // JSON array of CorpusSegment[] (structured, for preselection)
    createdBy: v.string(), // clerkUserId
    createdAt: v.number(),
  })
    .index('by_version', ['version'])
    .index('by_created', ['createdAt']),

  // Admin audit log — tracks who changed what in admin panel
  adminAuditLog: defineTable({
    actor: v.string(), // clerkUserId
    action: v.string(), // 'config.set', 'video.add', 'video.remove', etc.
    target: v.optional(v.string()), // ID or key of affected resource
    details: v.optional(v.string()), // JSON with context
    timestamp: v.number(),
  })
    .index('by_actor', ['actor'])
    .index('by_timestamp', ['timestamp']),

  // ============================================
  // Learning Instruments (Lem Parchment)
  // ============================================

  learnerArtifacts: defineTable({
    clerkUserId: v.string(),
    courseDocumentId: v.id('courseDocuments'),
    courseId: v.optional(v.id('courses')), // Denormalized for efficient course-level queries
    chapterNumber: v.number(), // 1, 2, 3 (or 0 for module-level tools like TimeBridge)
    toolId: v.string(), // glossator, skeletonKey, contrapositor, timeBridge, conceptRadar, reflectionGate
    content: v.string(), // JSON stringified payload (different structure per tool)
    score: v.optional(v.number()), // LLM-evaluated score 0-100
    feedback: v.optional(v.string()), // LLM-generated feedback
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_document', ['clerkUserId', 'courseDocumentId'])
    .index('by_user_document_tool', ['clerkUserId', 'courseDocumentId', 'toolId'])
    .index('by_user_and_course', ['clerkUserId', 'courseId']),

  // ============================================
  // Lead Capture (B2B/EDU/Executive Landing Pages)
  // ============================================

  leads: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    organization: v.string(),
    role: v.string(),
    message: v.optional(v.string()),
    segment: v.union(v.literal('business'), v.literal('edu'), v.literal('executive')),
    language: v.string(), // Language code when form was submitted
    createdAt: v.number(),
  })
    .index('by_segment', ['segment'])
    .index('by_created', ['createdAt']),

  // ============================================
  // Contact Form Submissions
  // ============================================

  contactSubmissions: defineTable({
    name: v.string(),
    email: v.string(),
    inquiryType: v.union(v.literal('enterprise_sales'), v.literal('technical_support'), v.literal('partnerships'), v.literal('press_media'), v.literal('general')),
    question: v.string(),
    language: v.string(),
    createdAt: v.number(),
  }).index('by_created', ['createdAt']),
};

export default defineSchema({
  ...applicationTables,
});
