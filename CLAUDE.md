# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bajkot is a personalized therapeutic storybook platform for children, built with Convex (backend) and React + Vite (frontend). Parents describe their child's situation (fears, challenges, behavioral issues), and the platform generates a custom illustrated story with therapeutic elements — delivered as a beautiful PDF.

**Domain:** bajkoterapia.org

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

All changes must pass `npm run lint`.

## CLI Tool (`cli/`)

CLI for testing and debugging the book pipeline without browser/auth. Requires `npx convex dev` running.

```bash
npm run cli -- <command>          # or: npx tsx cli/index.ts <command>
```

**Commands:**

| Command                                 | What it does                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| `order -n <name> [-w]`                  | Create order + start pipeline. `-w` watches progress. Defaults: style A, skip QA |
| `status [-s <status>]`                  | Pipeline stats + order list. Filter: `-s failed`, `-s completed`                 |
| `detail <orderId> [--artifacts]`        | Full order info. `--artifacts` dumps raw JSON                                    |
| `events <orderId>`                      | Pipeline event timeline with time deltas                                         |
| `logs [-u <userId>] [--full] [--users]` | LLM call logs. `--users` lists users with logs                                   |
| `download <orderId> [-o]`               | PDF download URL. `-o` opens in browser                                          |
| `watch <orderId>`                       | Poll order progress every 5s until terminal state                                |
| `retry <orderId> [-w]`                  | Restart a failed order from its `currentAgent`. `-w` watches after retry         |
| `presets`                               | List valid keys for problems, appearance, outfits                                |
| `prompts list`                          | List all pipeline prompts with DB status and version count                       |
| `prompts get <key>`                     | Show full prompt content by key (e.g. `bookStoryWriter`)                         |
| `prompts set <key> -f <file>`           | Update prompt in DB from file, with automatic version snapshot                   |
| `prompts seed`                          | Seed DB with fallback prompts (idempotent, won't overwrite existing)             |

**Global flags:**

| Flag     | What it does                                             |
| -------- | -------------------------------------------------------- |
| `--prod` | Run command against production deployment instead of dev |

**How it works:** Calls `convex/cli.ts` internal functions via `npx convex run` — no Clerk auth needed. Orders created by CLI use `clerkUserId: "cli-user"`. Use `--prod` to target production (e.g. `npm run cli -- prompts list --prod`).

**Short IDs:** `detail`, `events`, `download`, `watch`, and `retry` accept either the full Convex doc ID or the 12-char suffix shown in `status` output (resolved via `cli:resolveOrderId`).

**Typical test workflow:**

```bash
npm run cli -- order -n Zosia -w          # create + watch
npm run cli -- detail <orderId>           # inspect artifacts
npm run cli -- logs -u cli-user --full    # check LLM prompts
npm run cli -- download <orderId> -o      # grab PDF
```

See `cli/README.md` for full option reference.

## Architecture

### User Flow

There are two user flows: authenticated (via Clerk) and landing (token-gated, no login).

**Authenticated flow** (existing, for logged-in users):

1. **Home** (`/`) → Marketing page with topic grid
2. **Book Order** (`/book/order`) → Parent fills in child profile + problem description (requires Clerk auth)
3. **Pipeline** → Chain of LLM agents generates story, illustrations, review
4. **Progress** (`/book/:id/progress`) → Real-time pipeline progress
5. **Style Vote** (`/book/:id/vote`) → Parent picks illustration style
6. **Result** (`/book/:id/result`) → Final PDF download

**Landing flow** (public, token-gated):

1. **Home** (`/?token=<ACCESS_TOKEN>`) → Token saved to localStorage
2. **Topic page** (`/problem/:slug`) → SEO landing page per child problem (15 topics, SSG prerendered)
3. **Wizard** → Inline 4-step form on topic page, submits order via `startLandingOrder` (Convex action, validates token)
4. **Progress** (`/landing/book/:id/progress`) → Real-time progress (no auth, checks `clerkUserId === 'landing-user'`)
5. **Style Vote** (`/landing/book/:id/vote`) → Pick illustration style
6. **Result** (`/landing/book/:id/result`) → PDF download

**Access token:** The landing flow requires `LANDING_ACCESS_TOKEN` env var set in Convex. Users must visit any page with `?token=<value>` to activate. Token persists in localStorage (`bajkot_access_token`). Without a valid token, the wizard submit is blocked.

### Frontend (`src/`)

- `root.tsx`: React Router v7 entry with SSR support
- `routes/`: Route definitions (public marketing, landing book flow, auth-gated app routes)
- `pages/`: Public pages (HomePage, FaqPage, ContactPage)
- `components/book/`: Book order form, progress, vote, result (auth + landing variants)
- `components/topic-landing/`: Topic landing page components (TopicNav, TopicHero, TopicPain, TopicScience, TopicWizard, TopicFooter, TopicLayout)
- `components/landing/`: Legacy landing page sections (Hero, ValueProps, FAQ, CTA, Testimonial, Pitch)
- `data/topics.ts`: 15 topic definitions with SEO content, extracted from HTML prototypes
- `hooks/useAccessToken.ts`: Token capture from URL + localStorage persistence
- `lib/`: Client utilities (i18n, telemetry, routeMeta)
- `locales/`: Translation files (pl/) — namespaces: common, app, cookies, contact, faq, book

### Backend (`convex/`)

- `bookPipeline.ts`: Main pipeline orchestration (A0–A11 agents)
- `bookAgents.ts`: Individual agent implementations
- `bookPipelineHelpers.ts`: Pipeline state management
- `bookComposer.ts`: PDF composition
- `auth.ts` + `auth.config.ts`: Clerk authentication
- `schema.ts`: Database schema (bookOrders, bookIllustrations, bookPrompts, config, etc.)
- `leads.ts`: Lead capture for B2B segments
- `contact.ts`: Contact form submissions
- `lib/`:
  - `llmClient.ts`: LLM client with retry logic and model selection
  - `geminiImageGen.ts`: Gemini image generation for illustrations
  - `langfuse.ts`: Observability (Langfuse REST exporter)
  - `langfusePrompts.ts`: Prompt fetching from Langfuse
  - `prompts.ts`: Fallback prompt templates (book pipeline only)
  - `pipelineConfig.ts`: Model selection per pipeline stage
  - `config.ts`: DB-backed config with defaults
  - `rateLimiter.ts`: Rate limiting
  - `bookAgentUtils.ts`, `bookData.ts`, `bookTypes.ts`: Book pipeline utilities
  - `roles.ts`, `adminGuards.ts`: Admin authorization

### Admin (`src/admin/`, `convex/admin/`)

- `AdminLayout.tsx`: Admin panel (Dashboard, Config, Book Batch)
- `convex/admin/bookBatch.ts`: Batch book generation
- `convex/admin/bookPrompts.ts`: Prompt management
- `convex/admin/config.ts`: Admin key-value configuration

### Convex Conventions

**Read `.cursor/rules/convex_rules.mdc`** for detailed best practices. Key points:

- Use new function syntax: `query({ args, returns, handler })`
- Always include `args` and `returns` validators (use `v.null()` for void returns)
- Use `internalQuery/Mutation/Action` for private functions, `query/mutation/action` for public API
- Call functions via `ctx.runQuery/Mutation/Action` with function references from `api` or `internal`
- Define indexes for all query filters (never use `.filter()` alone)
- Never manually edit `convex/_generated/`

### Data Model

Key tables in `convex/schema.ts`:

- `bookOrders`: Order records with child profile, pipeline state, generated content
- `bookIllustrations`: Generated illustrations per order
- `bookPrompts`: Prompt template overrides
- `config`: Shared key-value config
- `rateLimits`: Rate limiting state
- `leads`: Lead capture submissions
- `contactSubmissions`: Contact form entries
- `adminConfig`, `adminAuditLog`: Admin configuration and audit trail
- `llmLogs`, `backendLogs`: Logging

### Book Pipeline Stages

Pipeline processes orders through agents A0–A11:

| Stage | Agent            | Purpose                    |
| ----- | ---------------- | -------------------------- |
| A0    | Profiling        | Analyze child profile      |
| A1    | Story Planning   | Plan story structure       |
| A2    | Story Writing    | Write chapters             |
| A3    | Psych Review     | Clinical review            |
| A4    | Art Direction    | Illustration prompts       |
| A5    | Image Generation | Generate illustrations     |
| A6    | Visual QA        | Check illustration quality |
| A7    | Final QA         | Final content review       |

## Key Workflows

### Observability

- Langfuse integration for tracing LLM calls (set `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY` in Convex env)
- If keys missing, observability helpers become no-op
- Prompts load from Langfuse first, fallback to `convex/lib/prompts.ts`

### Admin Security

- All admin functions call `assertAdmin(ctx)` which returns `{ subject }` for audit trail
- Admin mutations trigger `auditLog()` entries
- Rate limiting via `checkAdminRateLimit()` on expensive operations

## Environment Variables

**Frontend (Vite):** Stored in `.env.local`, accessed via `import.meta.env`

- `VITE_POSTHOG_KEY` — PostHog project API key
- `VITE_POSTHOG_HOST` — PostHog API endpoint
- `VITE_TURNSTILE_SITE_KEY` — Cloudflare Turnstile (lead form captcha)

**Backend (Convex):** Set via dashboard or `convex dev --env`

- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini API key (image generation + LLM)
- `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_BASE_URL` (optional)
- `ALLOWED_ORIGIN` — CORS origin (required in production)
- `LANDING_ACCESS_TOKEN` — Token for landing page order flow (validates `?token=` param, blocks unauthorized book generation)

Never commit secrets or `.env.local` files.

## Common Gotchas

1. **Always validate args and returns** in Convex functions
2. **Use indexes** for all queries (never `.filter()` alone)
3. **LLM prompts load from Langfuse first**, fallback to `prompts.ts`
4. **Admin queries have auth-protected and internal variants**: Use `config.getInternal` from internal actions, not `config.get` which requires admin role
5. **Pipeline stages are sequential**: Each agent depends on previous agent's output
6. **Three languages**: All user-facing strings must exist in en/, pl/, de/ locale files

## Important Paths

- `cli/`: CLI tool for pipeline testing (see CLI Tool section above)
- `convex/cli.ts`: Internal Convex functions for CLI (no auth)
- `src/data/topics.ts`: 15 topic landing page definitions (typed, extracted from HTML prototypes)
- `src/components/topic-landing/`: Topic landing page component kit
- `docs/prototypes/`: 15 HTML prototypes from Andrzej (source for topic data)
- `docs/spec-topic-landing-pages.md`: Architecture spec for topic pages
- `docs/devlog/`: Development journal (John Carmack .plan style, in Polish)
- `docs/bajkot-pipeline/`: Pipeline architecture documentation
- `docs/illustration_guide.md`: Illustration generation guide
- `.cursor/rules/convex_rules.mdc`: Must-read for Convex development
- `convex/lib/config.ts`: DB-backed config with defaults
- `docs/decisions/`: Architecture Decision Records (ADRs)

## Development Journal

We keep a devlog in `docs/devlog/` in John Carmack's .plan style:

- One file per day: `YYYY-MM-DD.md`
- Written in Polish
- Direct, technical, no fluff
- Focus on what was done, technical decisions, trade-offs

# currentDate

Today's date is 2026-03-04.
