# AITutoro — Frontend Architecture Guide

> **Read this before writing any code.** Last updated: 2026-02-21.

## Stack

| Layer     | Technology                       | Notes                                          |
| --------- | -------------------------------- | ---------------------------------------------- |
| Framework | React 19 + TypeScript            | —                                              |
| Build     | Vite 6                           | SPA build + build-time meta shell generation   |
| Styling   | Tailwind CSS 3                   | Token contract enforced via tailwind.config.js |
| Backend   | Convex                           | Public pages make zero direct Convex calls     |
| Auth      | Clerk + ConvexProviderWithClerk  | Never import directly in public page files     |
| Routing   | React Router DOM v7 (JSX routes) | BrowserRouter SPA                              |
| i18n      | i18next (EN/PL/DE)               | All user-visible strings in locales/           |
| Analytics | PostHog                          | Browser-only                                   |

## Directory Structure

```
src/
  pages/           <- One file per route. Max 400 lines. No direct Convex/Clerk imports.
  components/
    ui/            <- Primitive: Button, Card, Icon, Badge
    layout/        <- Structure: PageShell
    comparison/    <- Comparison article sub-components
    landing/       <- Landing page sub-components
  hooks/           <- Custom hooks (useLangFromUrl, usePublicNavigation)
  lib/             <- Utilities, config, i18n init
  locales/         <- Translation files (en/, pl/, de/)
scripts/           <- Build scripts (sitemap, meta shells)
docs/
  decisions/       <- Architecture Decision Records (ADRs)
```

## The Public Page Contract

Every file in `src/pages/` serving a public route MUST:

1. Use `useLangFromUrl()` from `@hooks/useLangFromUrl`
2. Render `<PageShell>` as outermost wrapper
3. Render `<PageHead>` with title, description, canonicalPath, currentLang
4. Render at least one `<JsonLd>` with BreadcrumbList schema
5. Have zero direct imports from `convex/*` or `@clerk/*` (use lazy wrappers)
6. Be under 400 lines
7. Be registered in `scripts/generate-sitemap.mjs` and `scripts/generate-meta-shells.mjs`

## The Tailwind Token Contract

Use only tokens from `tailwind.config.js`. No arbitrary `[value]` classes.

| Instead of                 | Use                     |
| -------------------------- | ----------------------- |
| `bg-[var(--accent)]`       | `bg-accent`             |
| `text-[var(--ink)]`        | `text-ink`              |
| `gray-100`                 | `neutral-100`           |
| `max-w-[1100px]`           | `max-w-content`         |
| `min-h-[calc(100vh-56px)]` | `<PageShell>` component |

Exception: `--segment-accent` variables are dynamic per-segment theming.

## SEO Architecture

Build-time meta shells (`scripts/generate-meta-shells.mjs`) create route-specific HTML with correct meta tags. Crawlers see content without JavaScript.

When adding a new public route:

1. Add route to `App.tsx`
2. Add to `scripts/generate-sitemap.mjs`
3. Add to `scripts/generate-meta-shells.mjs`

## Architecture Decisions

See `docs/decisions/` for ADRs.
