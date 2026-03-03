# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AITutoro is a personalized AI training platform built with Convex (backend) and React + Vite (frontend). The app guides learners through a 3-5 minute conversational intake to build a learner profile, performs skill verification, generates an assessment report, creates a personalized training plan, and facilitates payment via Stripe.

**Convex deployments:**

- Production: `accomplished-schnauzer-177`
- Staging: `coordinated-seahorse-267`

## Commands

```bash
npm install               # Install dependencies (run once)
npm run dev               # Start full stack (frontend + backend)
npm run dev:frontend      # Start only Vite dev server
npm run dev:backend       # Start only Convex dev server
npm run build             # Production build (creates dist/)
npm run lint              # Type-check both projects, validate Convex schema, build
npm run format            # Format code with Prettier
```

Automated tests are not yet wired up. All changes must pass `npm run lint`.

## Architecture

### User Flow

1. **Welcome** → **Chat** (intake with LLM agent) → **Skill Verification** (1-min prompt scoring)
2. **Profile Summary** → **Assessment** (Markdown report) → **Training Plan** (outline + deep guidance)
3. **Checkout** (Stripe) → **Thank You** → Back-office email

### Admin Content Pipeline Flow

1. **Video Ingestion** → Add videos from Google Drive folder sync or manual URL
2. **Gemini Analysis** → Process video in 5-min chunks, extract UI interaction segments
3. **Segment Review** → Admin reviews, tags, enables/disables segments
4. **Corpus Building** → Merge selected segments into versioned knowledge corpus
5. **Video-Enhanced Lessons** → PostHog feature flag enables video interleaving in course content

### Frontend (`src/`)

- `App.tsx`: Main React app, stitches screens together
- `components/steps/`: Step components for each stage of the flow
- `lib/`: Client utilities including telemetry

### Backend (`convex/`)

- `profiles.ts`: User profile management (queries/mutations) with rate limiting
- `ai.ts`: LLM orchestration (intake agent, assessment, playbook, scoring)
- `payments.ts`: Stripe checkout integration
- `auth.ts` + `auth.config.ts`: Convex Auth (anonymous auth enabled)
- `http.ts` + `router.ts`: HTTP routes (split to protect auth routes)
- `schema.ts`: Database schema (userProfiles, config, rateLimits)
- `lib/`:
  - `profileXml.ts`: XML parsing/serialization helpers for profile data
  - `langfuse.ts`: Observability spans/logs (Langfuse REST exporter)
  - `langfusePrompts.ts`: Prompt fetching from Langfuse
  - `llmClient.ts`: LLM client with retry logic
  - `prompts.ts`: Fallback prompt templates
  - `config.ts`: DB-backed config with defaults

### Admin Backend (`convex/admin/`)

- `videos.ts`: Video CRUD, Google Drive sync, Gemini processing, Cloudflare Stream upload
- `segments.ts`: Segment management (enable/disable, tagging, description editing)
- `corpus.ts`: Versioned corpus creation from filtered segments
- `config.ts`: Admin key-value configuration (active corpus, processing params)

### Admin Libraries (`convex/lib/`)

- `videoProcessing.ts`: Gemini video analysis orchestration (chunk-based processing)
- `geminiClient.ts`: Google Generative AI REST client (upload, wait, generate with retry)
- `googleDrive.ts`: Google Drive API integration (folder listing, file download)
- `cloudflareStream.ts`: Cloudflare Stream upload and URL generation
- `adminGuards.ts`: Admin authorization, rate limiting, audit logging, bulk limits

### Admin Frontend (`src/admin/`)

- `AdminLayout.tsx`: Admin panel wrapper with navigation
- `pages/AdminDashboard.tsx`: Overview and stats
- `pages/VideoList.tsx`: Video browser with sort, sync, processing controls
- `pages/SegmentEditor.tsx`: Segment table with floating video preview
- `pages/CorpusEditor.tsx`: Corpus creation with tag filtering
- `pages/AdminConfig.tsx`: Pipeline configuration panel
- `components/SegmentVideoPlayer.tsx`: Cloudflare Stream video embed

### Video-Enhanced Course Components

- `src/components/course/LessonVideoEmbed.tsx`: Video player for inline course content
- `src/components/course/HandbookContent.tsx`: Parses `:::video{...}:::` markers into video embeds
- `convex/videoLookup.ts`: Maps video filenames to Cloudflare Stream UIDs

### Prompt Formatting Policy

All LLM prompts in `convex/lib/prompts.ts` follow the policy defined in `docs/prompt-policy.md`. Use Markdown headers for structure, not ALL_CAPS labels or bold-as-headers.

### Convex Conventions

**Read `.cursor/rules/convex_rules.mdc`** for detailed best practices. Key points:

- Use new function syntax: `query({ args, returns, handler })`
- Always include `args` and `returns` validators (use `v.null()` for void returns)
- Use `internalQuery/Mutation/Action` for private functions, `query/mutation/action` for public API
- Call functions via `ctx.runQuery/Mutation/Action` with function references from `api` or `internal`
- Define indexes for all query filters (never use `.filter()` alone)
- Never manually edit `convex/_generated/`

### Data Model

The **canonical profile** is stored as XML in `userProfiles.profileXml` (source of truth). Use helpers in `convex/lib/profileXml.ts` for parsing/serialization.

**Profile XML structure:**

- `tools`: AI tools used (name, tier, usage frequency)
- `role`: Job title + seniority
- `artifacts`: Types of content produced
- `needs`: Learning goals (category + free text)
- `preferences.negative`: Topics to exclude
- `skills.self_report`: Self-assessed skill levels (1-5 Likert)
- `skills.performance`: Scored prompt task (0-1)
- `constraints`: Time availability, language

**userProfiles table also includes:**

- `chatHistory`: Conversational intake messages
- `assessmentReport`: Markdown assessment
- `planOutline`: Lightweight plan cards (user-editable)
- `planFull`: Deep guidance per page (for PDF generation)
- `paymentStatus`, `stripeSessionId`: Payment flow

### Admin Pipeline Tables

- `pipelineVideos`: Video records (fileName, status, cloudflareStreamUid, toolDetected)
- `videoSegments`: Timestamped segments with descriptions, metadata, tags, enabled flag
- `knowledgeCorpora`: Versioned merged segment collections with tag filters
- `adminConfig`: Key-value admin configuration (indexed by key)
- `adminAuditLog`: Audit trail of admin actions

### Course & Exercise Tables

- `courseDocuments`: Generated 3-chapter handbooks per outline page
- `exercises`: Interactive exercises per chapter (prompt_improvement, problem_solving, reflection)
- `exerciseSubmissions`: User responses with AI evaluation scores
- `chapterProgress`: Per-chapter progress tracking
- `userPoints`: Gamification points from exercise completion
- `activityLog`: User activity events

## Key Workflows

### LLM Orchestration (`ai.ts`)

- **Intake**: `generateNextQuestion` regenerates full `profileXml` each turn from conversation
- **Scoring**: `scorePrompt` evaluates prompt (rubric: goal, context, structure, quality, iteration)
- **Assessment**: `generateAssessmentReport` creates Markdown report (180-300 words, English)
- **Playbook**: `generatePlaybook` creates outline (5 visible cards) + deep guidance per page

### Profile Management (`profiles.ts`)

- `getOrCreateProfile`: Fetch or initialize user profile (uses session ID for identification)
- `updateProfile`: Merge updates into profile
- `addChatMessage`: Append message to chat history
- Rate limiting applied to prevent abuse

### Observability

- Langfuse integration for tracing LLM calls (set `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY` in Convex env)
- If keys missing, observability helpers become no-op
- Visit `/test` in frontend for manual observability testing
- Prompts load from Langfuse first, fallback to `convex/lib/prompts.ts`

### Video Processing Pipeline (`convex/lib/videoProcessing.ts`)

- **processFullVideo**: Download from Drive → Upload to Gemini → Wait for ACTIVE → Process in chunks → Merge → Return segments
- **Chunking**: 5-minute windows with 30-second overlap, configurable via admin config
- **Model**: `gemini-2.0-flash-001` (configurable). Gemini Flash for cost-efficient video analysis
- **Output**: Structured JSON with timestamped segments, rich visual narration, metadata

### Feature Flags (PostHog)

- `video-enhanced-lessons`: Per-user flag. When enabled, course content includes video embeds via `:::video{src="..." start=N end=N}:::` syntax
- Frontend checks flag → passes `videoEnhanced: true` to backend
- Backend loads active corpus, passes to video-enhanced prompt variants
- Backward compatible: if flag disabled or undefined, standard text-only content

### Admin Security Conventions

- All admin functions call `assertAdmin(ctx)` which returns `{ subject }` for audit trail
- Admin mutations trigger `auditLog()` entries
- Bulk operations checked with `assertBulkLimit()` (max 200 items)
- Rate limiting via `checkAdminRateLimit()` on expensive operations

## Environment Variables

**Frontend (Vite):** Stored in `.env.local`, accessed via `import.meta.env`

**Backend (Convex):** Set via dashboard or `convex dev --env`

- `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_BASE_URL` (optional)
- Stripe keys

### Content Pipeline (Backend — Convex env)

- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini API key (video analysis)
- `GOOGLE_API_KEY` — Google APIs key (Drive folder access)
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID
- `CLOUDFLARE_STREAM_API_TOKEN` — Cloudflare Stream API token
- `ALLOWED_ORIGIN` — CORS origin for streaming endpoint (required in production)

### Video Pipeline (Frontend — `.env.local`)

- `VITE_CLOUDFLARE_CUSTOMER_SUBDOMAIN` — Cloudflare Stream customer subdomain (required for video playback in admin segment editor and course content)

### Analytics (Frontend — `.env.local`)

- `VITE_POSTHOG_KEY` — PostHog project API key
- `VITE_POSTHOG_HOST` — PostHog API endpoint (default: https://app.posthog.com)

Never commit secrets or `.env.local` files.

## Common Gotchas

1. **Profile XML is canonical**: derive any UI state from XML only
2. **Always validate args and returns** in Convex functions
3. **Use indexes** for all queries (never `.filter()` alone)
4. **HTTP routes** are in `convex/router.ts` (separated to protect auth routes)
5. **LLM prompts load from Langfuse first**, fallback to `prompts.ts`
6. **Session-based identification**: Uses session ID (not user ID) for anonymous users
7. **Admin queries have auth-protected and internal variants**: Use `config.getInternal` / `corpus.getInternal` from internal actions, not `config.get` / `corpus.get` which require admin role
8. **Video processing is chunk-based**: Don't assume a single Gemini call per video. Videos are split into 5-min chunks with overlap
9. **PostHog feature flag controls video content**: `video-enhanced-lessons` flag must be enabled per-user for video embeds to appear
10. **Gemini client has retry logic**: Always use `geminiClient.ts` functions, not raw fetch calls to the Gemini API

## Important Paths

- `docs/prd.md`: Product requirements (detailed spec, in Polish)
- `docs/devlog/`: Development journal (John Carmack .plan style, in Polish)
- `AGENTS.md`: Repository guidelines for AI agents
- `.cursor/rules/convex_rules.mdc`: Must-read for Convex development
- `convex/lib/config.ts`: DB-backed config with defaults

## Development Journal

We keep a devlog in `docs/devlog/` in John Carmack's .plan style:

- One file per day: `YYYY-MM-DD.md`
- Written in Polish
- Direct, technical, no fluff
- Focus on what was done, technical decisions, trade-offs
- Include thoughts and observations about the code
