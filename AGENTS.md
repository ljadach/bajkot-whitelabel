# Repository Guidelines

## Project Structure & Module Organization

Frontend React/TypeScript code lives in `src/`, with entry point in `src/root.tsx` (React Router v7 with SSR). Public pages are in `src/pages/`, book feature components in `src/components/book/`, landing page sections in `src/components/landing/`, and shared UI in `src/components/`. Client helpers live in `src/lib/`, translations in `src/locales/` (EN/PL/DE).

Convex backend modules (queries, mutations, actions, schema) live under `convex/`, with book pipeline agents in `convex/bookAgents.ts` and pipeline orchestration in `convex/bookPipeline.ts`. Admin functions are in `convex/admin/`. Shared libraries (LLM client, logging, config) are in `convex/lib/`. Anything inside `convex/_generated` is auto-created — never edit it manually.

Tailwind/Vite/ESLint configs stay at the repo root, project docs sit in `docs/`, and build artifacts land in `dist/` (leave untracked).

## Build, Test, and Development Commands

Run `npm install` once, then use `npm run dev` for the full stack (spawns Vite + `convex dev`). Use `npm run dev:frontend` or `npm run dev:backend` when focusing on one side. `npm run build` creates the production bundle. `npm run lint` type-checks both projects, runs the Convex schema validation (`convex dev --once`), and builds to verify artifacts.

## Coding Style & Naming Conventions

Stick to TypeScript with React functional components, 2-space indentation, and default Prettier formatting (`npx prettier --write src convex`). Components and hooks use `PascalCase` and `useCamelCase`; utility modules favor lowercase hyphenated filenames, and Convex files stay domain-focused (`bookPipeline.ts`, `leads.ts`). Tailwind utility classes handle styling — avoid ad-hoc CSS unless it belongs in `src/index.css`.

## Convex Conventions

Read file `.cursor/rules/convex_rules.mdc` to understand how to use Convex. Key points:

- Use new function syntax: `query({ args, returns, handler })`
- Always include `args` and `returns` validators
- Use `internalQuery/Mutation/Action` for private functions
- Define indexes for all query filters (never `.filter()` alone)
- Never manually edit `convex/_generated/`

## Testing Guidelines

E2E tests live in `e2e/tests/` using Playwright. Book-specific tests: `10-book-order-form.spec.ts`, `11-book-pipeline-smoke.spec.ts`. Page objects in `e2e/pages/`. All changes must pass `npm run lint`.

## Internationalization

All user-facing strings go through `react-i18next`. Translation files in `src/locales/{en,pl,de}/`. Namespaces: `common`, `app`, `cookies`, `contact`, `faq`, `book`. Never hardcode user-visible strings in components.

## Security & Configuration Tips

Keep secrets in `.env.local` files consumed by Vite (`import.meta.env`) or Convex (`convex dev --env`). Never commit deployment keys or the generated `convex/_generated` output. When touching auth logic (`convex/auth.ts`, `auth.config.ts`), verify access rules, and inject API keys at runtime rather than hardcoding them.
