# ADR-003: Public Page SEO Contract

**Date:** 2026-02-21
**Status:** Accepted

## Context

SEO requirements (meta tags, structured data, canonical URLs) were inconsistently applied.

## Decision

Every public page must include `<PageHead>`, `<JsonLd>`, and be registered in both sitemap and meta shell scripts. ESLint bans direct auth dependency imports.

## Consequences

- Consistent SEO across all public pages
- New pages have a clear checklist to follow
- Auth dependencies isolated behind lazy-load boundaries
