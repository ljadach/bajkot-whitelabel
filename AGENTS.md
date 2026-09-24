# Repository Guidelines

## Project Structure & Module Organization

White-label order flow for personalised storybooks (see `README.md`). Frontend React/TypeScript code lives in `src/`: the root layout in `src/root.tsx` (React Router v7 with SSR), routes in `src/routes.ts` + `src/routes/`, the order flow and book screens in `src/components/book/`, theming in `src/lib/theme.ts`. Translations live in `src/locales/pl/book.json` (Polish only).

Convex backend modules (queries, mutations, actions, schema) live under `convex/`, with book pipeline agents in `convex/bookAgents.ts` and the order API in `convex/bookPipeline.ts`. Shared libraries (LLM client, partners, topics, pricing, Stripe mode) are in `convex/lib/`; `convex/lib/partners.ts` and `convex/lib/topics.ts` are imported by the frontend too. Anything inside `convex/_generated` is auto-created — never edit it manually.

Tailwind/Vite/ESLint configs stay at the repo root, project docs sit in `docs/`, and build artifacts land in `build/` (leave untracked).

## Build, Test, and Development Commands

Run `npm install` once, then use `npm run dev` for the full stack (spawns the React Router dev server + `convex dev`). `npm run lint` type-checks both projects (`tsc -p convex`, `tsc -p tsconfig.app.json`), runs ESLint, pushes the Convex schema (`convex dev --once`) and builds. `npm test` runs the unit tests in `tests/unit/`.

## Coding Style & Naming Conventions

Stick to TypeScript with React functional components, 2-space indentation, and default Prettier formatting (`npm run format`). Components and hooks use `PascalCase` and `useCamelCase`. Tailwind utility classes handle styling; brand colours come from the partner theme (`primary-*`, `accent-*`, `text-on-accent`, `text-accent-ink`) — never hardcode a brand colour or name.

## Convex Conventions

Read file `.cursor/rules/convex_rules.mdc` to understand how to use Convex. Key points:

- Use new function syntax: `query({ args, returns, handler })`
- Always include `args` and `returns` validators
- Use `internalQuery/Mutation/Action` for private functions
- Define indexes for all query filters (never `.filter()` alone)
- Never manually edit `convex/_generated/`

## Testing Guidelines

Unit tests live in `tests/unit/` (vitest). `partners.test.ts` validates the partner registry, URL builders and consent payloads; add a partner and run `npm test`. All changes must pass `npm run lint`.

## Security & Configuration Tips

Keep secrets in `.env.local` (Vite) or the Convex dashboard env. Never commit deployment keys. There is no login: order data is protected by per-order capability tokens (`convex/lib/roles.ts`), and return/e-mail URLs are always built server-side from `convex/lib/partners.ts`.
