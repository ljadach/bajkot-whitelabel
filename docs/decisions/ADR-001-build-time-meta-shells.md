# ADR-001: Build-Time Meta Shell Strategy for SEO

**Date:** 2026-02-21
**Status:** Accepted

## Context

Public pages are client-rendered React. All meta tags are injected by JavaScript. LinkedIn, Slack, WhatsApp, and Bing see blank shells.

The main entry point initializes Clerk, Convex, and PostHog — all require browser APIs.

## Decision

Generate route-specific HTML at build time. A post-build script reads the Vite output and creates copies with correct meta for each route. Vercel serves these via `cleanUrls`.

## Why Not Full SSG

vite-ssg is Vue-only. Vike requires significant architecture changes. Meta shells solve 80% of the SEO problem at 20% of the effort.

## Consequences

- Crawlers see correct page-specific meta
- No changes to React code or provider tree
- New routes must be added to the meta shell script
