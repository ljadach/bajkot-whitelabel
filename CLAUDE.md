# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

White-label demo of the personalised therapeutic storybook service, used to
pitch the product to B2B partners. It contains **only the order flow** — topic
picker → order form → live progress (style vote, dedication) → preview +
Stripe paywall → download — rendered in a partner's name, logo and colours
chosen by the URL.

Fork of `c3z/bajkot` (bajkoterapia.org) with full history. The book pipeline
(`convex/bookAgents.ts` and friends) is shared code: keep it close to upstream
so fixes can be cherry-picked. Everything else from bajkot (marketing site,
topic LPs, FAQ, pricing, contact, legal pages, Clerk login, dashboard, admin
panel, analytics, leads) was removed on purpose — don't bring it back.

**Deployments:** not set up yet — own Convex project + own Vercel project,
domain to be decided (Cezary). Checklist: `docs/whitelabel-setup.md`. Never
point this repo at bajkot's Convex deployments (`wonderful-egret-522` prod,
`proficient-anaconda-129` dev).

## Session start checklist

Check `.env.local` for the active `CONVEX_DEPLOYMENT` and say which one it is.
Then remind the user of the open risks in `TODO.md` (they don't go away by
themselves):

1. **Open intake** — anyone can start a book (LLM + image cost) with no access
   code and no rate limit. Chosen deliberately for the demo.
2. **Test mode gives books away** — while `STRIPE_MODE=test`, anyone can pay
   with card 4242.
3. **Children's data in `llmLogs`** (full prompts). Langfuse must stay unset.

## Commands

```bash
npm install               # Install dependencies (run once)
npm run dev               # Start full stack (frontend + backend)
npm run dev:frontend      # Start only the React Router dev server
npm run dev:backend       # Start only Convex dev server
npm run build             # Production build
npm run lint              # Typecheck convex + app, eslint, push schema, build
npm test                  # Unit tests (vitest)
npm run format            # Format code with Prettier
npm run check:dead-code   # knip
```

All changes must pass `npm run lint` and `npm test`. Note: the app typecheck is
`tsc -p tsconfig.app.json` — the root `tsconfig.json` is a solution file and
`tsc -p .` checks nothing.

## CLI Tool (`cli/`)

Ops/debug CLI over `npx convex run` (no auth). `--prod` targets the prod
deployment. Full reference: `cli/README.md`.

| Command                                 | What it does                                                        |
| --------------------------------------- | ------------------------------------------------------------------- |
| `order -n <name> [-w]`                  | Create order + start pipeline (`clerkUserId: "cli-user"`, no theme) |
| `status [-s <status>]`                  | Pipeline stats + order list                                         |
| `detail <orderId> [--artifacts]`        | Full order info                                                     |
| `events <orderId>`                      | Pipeline event timeline                                             |
| `logs [-u <userId>] [--full] [--users]` | LLM call logs                                                       |
| `download <orderId> [-o]`               | PDF download URL                                                    |
| `watch <orderId>` / `retry <orderId>`   | Poll progress / restart a failed order                              |
| `skip-dedication <orderId>`             | Unstick an order waiting in `awaiting_dedication`                   |
| `prompts list\|get\|set\|seed`          | Pipeline prompts in the DB                                          |

Payment links for unpaid orders: `npx convex run cli:createPaymentLink '{"orderId":"…"}'`.

## Architecture

### Partner themes (`convex/lib/partners.ts`)

- `PARTNERS` registry: `id` (URL slug), `name`, `tagline`, `logoUrl`,
  `colors.primary` / `colors.accent`, `supportEmail`, `legalEntity`,
  `termsUrl`, `privacyUrl`. `demo` is the default ("Twoja Marka").
- The **first URL segment** selects the partner: `/` → default,
  `/przyklad/...` → partner `przyklad`. `?partner=<id>` redirects to the
  prefix form; unknown ids 404 (`src/routes/partner.tsx`).
- URL builders (`startPath`, `orderFormPath`, `bookProgressPath`,
  `bookResultPath`) are shared by the frontend and the backend (e-mail links,
  Stripe return URLs, payment links) — never build these URLs by hand.
- `bookOrders.partnerId` is set at intake (`startLandingOrder` validates it),
  so e-mails and Checkout use the order's partner.
- Frontend theming: `src/lib/theme.ts` turns the two colours into
  `--primary-*` / `--accent-*` CSS variable scales (`convex/lib/palette.ts`),
  injected into `<head>` during SSR. Tailwind colours `primary-*`, `accent-*`
  read them. Use `text-on-primary` / `text-on-accent` for text on brand fills
  and `text-primary-ink` / `text-accent-ink` for brand-coloured text on white —
  they are contrast-checked, so a light brand colour stays readable.
- `usePartner()` / `usePartnerPaths()` (`src/hooks/usePartner.ts`) inside
  components.

### Routes (`src/routes.ts`)

All under the optional `:partner?` prefix:

| Route                    | File                       | Screen                                            |
| ------------------------ | -------------------------- | ------------------------------------------------- |
| `/`                      | `routes/start.tsx`         | `TopicPicker` (step 1 of 3)                       |
| `/zamow/:slug`           | `routes/order.tsx`         | `OrderFlow` — situation, then `?krok=2` checkout  |
| `/bajka/:orderId`        | `routes/book-progress.tsx` | `BookProgress` — progress, style vote, dedication |
| `/bajka/:orderId/gotowa` | `routes/book-result.tsx`   | `BookResult` — preview + paywall, then download   |

Order pages authenticate with the per-order capability token returned by
`startLandingOrder`, kept in localStorage (`src/hooks/useOrderToken.ts`) and
carried in e-mail links as `?t=`.

### Backend (`convex/`)

- `bookPipeline.ts` — public API: `startLandingOrder` + token-gated queries and
  mutations (progress, style vote, dedication, preview, download). The
  `Landing` prefix in names is inherited from bajkot, where a login flow
  existed too.
- `bookAgents.ts`, `bookPipelineHelpers.ts`, `bookPipelineEvents.ts`,
  `bookComposer.ts` (pdfkit), `bookComposerRender.ts` (typst-render service),
  `bookIntakeGuard.ts` (moderation) — the pipeline, shared with upstream.
- `stripe.ts` — Checkout + webhook; `lib/stripeMode.ts` — test/live switch;
  `billing.ts` — payment state, `getPaymentMode` for the test banner.
- `email.ts` + `lib/email.ts` — partner-themed transactional e-mails (Resend).
- `lib/topics.ts` — the 39-topic catalog (shared with the frontend).
- `lib/pricing.ts` — display prices (shared). Stripe Prices must match.
- `admin/bookPrompts.ts` — prompt storage (internal functions only; the
  admin UI is gone).
- `cli.ts` — internal functions behind the CLI.

### Book Pipeline Stages

| Stage | Agent              | Purpose                                             |
| ----- | ------------------ | --------------------------------------------------- |
| A0    | Intake             | Validate the order (code only)                      |
| A1    | Child Profiler     | Profile of the child and the problem                |
| A2    | Story Architect    | Story blueprint                                     |
| A3    | Story Writer       | The text                                            |
| A4    | Psych Reviewer     | Clinical review (skipped for orders: skipQaReviews) |
| A5    | Art Director       | Illustration plan                                   |
| A6    | Character Designer | Hero design                                         |
| A6b   | Style Vote         | Two style samples — the parent picks one            |
| A7    | Illustrator        | Illustrations (Gemini)                              |
| A8    | Visual QA          | Illustration checks                                 |
| A9    | Composer           | PDF (pdfkit or typst-render); waits for dedication  |
| A10   | Final QA           | Final content check                                 |
| A11   | Delivery           | Mark complete, e-mail when paid                     |

Prompts load from the `bookPrompts` table, falling back to
`convex/lib/prompts/bookFallbacks.ts`.

### Stripe

`STRIPE_MODE` (`test` unless exactly `live`) picks which of the two key sets
(`STRIPE_TEST_*`, `STRIPE_LIVE_*`) new sessions use. The webhook verifies
against both secrets; `paymentCounts()` lets test payments unlock orders only
while the site is in test mode. Return URLs are built server-side from the
order's partner (a client-supplied return path would be an open redirect).

### Convex Conventions

**Read `.cursor/rules/convex_rules.mdc`** for detailed best practices. Key points:

- Use new function syntax: `query({ args, returns, handler })`
- Always include `args` and `returns` validators (use `v.null()` for void returns)
- Use `internalQuery/Mutation/Action` for private functions, `query/mutation/action` for public API
- Call functions via `ctx.runQuery/Mutation/Action` with function references from `api` or `internal`
- Define indexes for all query filters (never use `.filter()` alone)
- Never manually edit `convex/_generated/` — `npx convex dev` regenerates it

## Common Gotchas

1. **Always validate args and returns** in Convex functions.
2. **Polish only** — `src/locales/pl/book.json` is the single namespace.
3. **Tailwind config changes need a dev-server restart.**
4. **Don't hardcode brand strings** — the partner theme supplies name, colours,
   support e-mail and legal entity. `tests/unit/partners.test.ts` checks the
   consent wording never names the original operator.
5. **A new partner id must not collide with a route** (`zamow`, `bajka`, …) —
   `RESERVED_PATH_SEGMENTS`, enforced by the unit test.
6. **SVG logos don't show in e-mails** (Gmail/Outlook) — e-mails fall back to
   the name; ship a PNG when the partner cares.

## Environment Variables

Frontend (Vite, `.env.local`): `VITE_CONVEX_URL`.

Backend (Convex): see the table in `docs/whitelabel-setup.md` — LLM keys,
`APP_URL`, `STRIPE_MODE` + `STRIPE_{TEST|LIVE}_*`, Resend, optional typst-render
and R2. Keep `LANGFUSE_*` unset.

Never commit secrets or `.env.local` files.

## Development Journal

We keep a devlog in `docs/devlog/` in John Carmack's .plan style:

- One file per day: `YYYY-MM-DD.md`
- Written in Polish
- Direct, technical, no fluff
- Focus on what was done, technical decisions, trade-offs
