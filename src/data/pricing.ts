/**
 * Single source of truth for LP pricing copy (spec-lp-v4-rollout.md, F1).
 * Prices shown on landing pages MUST match the Stripe checkout prices —
 * when moving these to Convex `config`, add an integration test comparing
 * this module with the active Stripe Price.
 */

export const PRICING = {
  pdf: {
    regular: 59,
    promo: 49,
    /** Omnibus: lowest price within the last 30 days. */
    omnibus: 49,
  },
  printBundle: 99,
  audioBundle: 69,
} as const;

/** One number everywhere — video says "10 minut", old hero said "15" — unify. */
export const GENERATION_MINUTES = 20;
