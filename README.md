# Personalised storybooks — white-label demo

A white-label build of the personalised therapeutic storybook service: only the
order flow, from picking a topic to downloading the book, in a partner's name,
logo and colours. Used to pitch the product to B2B partners.

It is a fork of [`c3z/bajkot`](https://github.com/c3z/bajkot) (full git history
kept, so pipeline fixes can be cherry-picked from upstream). Everything outside
the order flow — marketing site, topic landing pages, FAQ, pricing, contact,
legal pages, login, dashboard, admin panel, analytics — has been removed.

Built with [Convex](https://convex.dev) (backend + the LLM/image pipeline) and
React Router v7 (SSR on Vercel). Polish only.

## The flow

| Step | URL                     | What happens                                                            |
| ---- | ----------------------- | ----------------------------------------------------------------------- |
| 1    | `/`                     | Pick a topic (39 topics in 7 categories)                                |
| 2–3  | `/zamow/<topic>`        | Child, situation, appearance, e-mail, consents → the book starts        |
| —    | `/bajka/<order>`        | Live progress; the parent picks the illustration style and a dedication |
| —    | `/bajka/<order>/gotowa` | 7-page preview → Stripe Checkout (PDF or PDF + print) → flipbook + PDF  |

E-mails (payment confirmation, book ready) link back to the order in the same
partner theme.

## Partners (themes chosen by the link)

The first path segment picks the theme:

- `https://<domain>/` — the neutral placeholder brand, "Twoja Marka"
- `https://<domain>/przyklad` — the example partner (own logo, light accent)
- `https://<domain>/?partner=przyklad` — same thing; redirects to `/przyklad`

Unknown partner ids 404. The theme applies everywhere: header, favicon, page
titles, buttons, consent wording, e-mails, the Stripe Checkout note. Every
order remembers its partner.

**Adding a partner** — edit `convex/lib/partners.ts`:

```ts
{
  id: 'acme',                       // URL slug: /acme
  name: 'Acme Books',
  tagline: 'bajki dla najmłodszych', // optional
  logoUrl: '/partners/acme.png',    // optional, file in public/partners/ (PNG shows in e-mails, SVG doesn't)
  colors: { primary: '#0f766e', accent: '#f59e0b' }, // any brand colours — text contrast is automatic
  supportEmail: 'bajki@acme.pl',    // optional: footer, e-mail reply-to, print requests
  legalEntity: 'Acme Sp. z o.o.',   // optional: named in the consent checkbox
  termsUrl: 'https://…',            // optional: links in the consent checkbox
  privacyUrl: 'https://…',
},
```

then `npm test` (validates the registry) and `npm run deploy`.

## Stripe: test and live mode

Both key sets live side by side in the Convex env and `STRIPE_MODE` picks one
(`test` unless it is exactly `live`). Switching takes effect immediately, no
redeploy:

```bash
npx convex env set STRIPE_MODE live --prod   # real payments
npx convex env set STRIPE_MODE test --prod   # demo: card 4242 4242 4242 4242
```

In test mode the paywall shows the test card. A test-mode payment never unlocks
an order while the site is in live mode. Details:
[`docs/whitelabel-setup.md`](docs/whitelabel-setup.md#stripe).

## Quick start

```bash
npm install
npm run dev        # frontend + `convex dev` (first run creates a Convex dev deployment)
```

A new environment needs a Convex project, Vercel project, Stripe, Resend and
LLM keys — follow [`docs/whitelabel-setup.md`](docs/whitelabel-setup.md).

## Commands

```bash
npm run dev              # full stack
npm run lint             # typecheck (convex + app), eslint, schema push, build
npm test                 # unit tests (vitest)
npm run format           # prettier
npm run check:dead-code  # knip
npm run deploy           # convex deploy + vercel --prod
npm run cli -- <cmd>     # pipeline CLI — see cli/README.md
```

## Project structure

- `src/` — frontend: routes (`src/routes.ts`), order flow and book screens
  (`src/components/book/`), theming (`src/lib/theme.ts`)
- `convex/` — backend: order intake and pipeline (`bookPipeline.ts`,
  `bookAgents.ts`), Stripe (`stripe.ts`, `billing.ts`, `lib/stripeMode.ts`),
  e-mails (`email.ts`, `lib/email.ts`)
- `convex/lib/partners.ts` — partner themes + URL builders, shared by both halves
- `convex/lib/topics.ts` — the topic catalog (next to the backend data its `problemId`s key)
- `cli/` — ops CLI (create/watch/retry orders, logs, prompts)
- `docs/` — setup checklist, pipeline architecture, devlog

See `CLAUDE.md` for the detailed architecture.
