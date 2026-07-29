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

## Amendment (2026-07-28) — namespace rule + enforcement reality

**New palettes must be namespaced.** Adding the LP v4 palette with bare keys
(`navy`, `cream`, `amber`, `teal`, `ink`) silently overwrote the existing enterprise
`ink` token, which recoloured the cookie banner across the whole app — a token
collision reads as a random visual bug far from the change. The palette now lives under
`lp.*` (`bg-lp-cream`, `text-lp-navy`). Rule: a palette belonging to one surface gets its
own namespace; only genuinely global tokens take top-level keys.

**Enforcement is convention, not tooling.** The "ESLint enforces this" claim above was
never true — no such rule exists in `eslint.config.js`, and arbitrary values are in use
across `src/` (admin, book, pages, topic-landing). Treat the ban as a code-review norm
for public pages: reach for a token first, and keep `[value]` for genuine one-offs
(exact photo widths, modal `z-index`, sub-`text-xs` sizes copied from a prototype).
Either add the rule or drop the claim next time this ADR is revisited.
