# Repository Guidelines

## Project Structure & Module Organization

Frontend React/TypeScript code lives in `src/`, with screens stitched together through `src/App.tsx`, shared UI in `src/components`, and client helpers in `src/lib`. Convex backend modules (queries, mutations, HTTP routes, schemas) live under `convex/`, and anything inside `convex/_generated` is auto-created—never edit it manually. Tailwind/Vite/ESLint configs stay at the repo root, product context sits in `docs/`, and build artifacts land in `dist/` (leave untracked).

## Build, Test, and Development Commands

Run `npm install` once, then use `npm run dev` for the full stack (spawns Vite + `convex dev`). Use `npm run dev:frontend` or `npm run dev:backend` when focusing on one side. `npm run build` creates the production bundle in `dist/`. `npm run lint` type-checks both projects, runs the Convex schema validation (`convex dev --once`), and builds to verify artifacts.

## Coding Style & Naming Conventions

Stick to TypeScript with React functional components, 2-space indentation, and default Prettier formatting (`npx prettier --write src convex`). Components and hooks use `PascalCase` and `useCamelCase`; utility modules favor lowercase hyphenated filenames, and Convex files stay domain-focused (`profiles.ts`, `payments.ts`). Tailwind utility classes handle styling—avoid ad-hoc CSS unless it belongs in `src/index.css`.

## Convex conventions

Read file ./.cursor/rules/convex_rules.mdc to understand how to use convex. This is important for coding nicely.

## Testing Guidelines

Automated tests are not yet wired up, so rely on the typed lint suite plus manual verification. Add future frontend specs under `src/__tests__` (Vitest) and backend validations under `convex/lib`. Regardless, every change must pass `npm run lint`, exercise the tutor flow end-to-end via `npm run dev`, and confirm Convex schema migrations are checked in.

## Commit & Pull Request Guidelines

Recent commits favor short, imperative subjects (e.g., `Fix flow and ux`). Mirror that style, keep scope tight, and reference related issues with `(#123)` when needed. Pull requests should describe the problem, the approach, and any schema or environment changes. Include screenshots or screen recordings for UI tweaks, list manual test commands, and call out impacts to Convex deployments (new tables, auth rules, etc.).

## Security & Configuration Tips

Keep secrets in `.env.local` files consumed by Vite (`import.meta.env`) or Convex (`convex dev --env`). Never commit deployment keys or the generated `convex/_generated` output. When touching auth logic (`convex/auth.ts`, `auth.config.ts`), verify anonymous access rules still block sensitive routes, and inject Stripe or other API keys at runtime rather than hardcoding them.
