# ADR-002: Tailwind Token Contract

**Date:** 2026-02-21
**Status:** Accepted

## Context

Three competing token systems (Tailwind config, CSS custom properties, raw utilities) with no rules. Inconsistency across pages.

## Decision

All styling uses tokens from `tailwind.config.js`. Arbitrary `[value]` classes are banned in public pages. ESLint enforces this.

## Consequences

- Single source of truth for design tokens
- New tokens must be added to tailwind.config.js before use
- Exception for `--segment-*` dynamic theming variables
