/**
 * Rate Limiting Helper (Sliding Window Algorithm)
 *
 * Implements rate limiting to prevent abuse of LLM endpoints.
 * Uses sliding window algorithm for smooth limit enforcement.
 *
 * Configuration (per PRD):
 * - 30 LLM calls per 5 minutes per user
 * - Sliding window (not fixed window)
 * - User-scoped (by Clerk user ID)
 */

import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { DataModel } from '../_generated/dataModel';

// Rate limit configuration
export const RATE_LIMIT_CONFIG = {
  llm_call: {
    maxCalls: 30,
    windowMs: 5 * 60 * 1000, // 5 minutes
  },
  profile_update: {
    maxCalls: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  admin_action: {
    maxCalls: 60,
    windowMs: 60 * 1000, // 1 minute — generous but prevents runaway
  },
} as const;

export type ActionType = keyof typeof RATE_LIMIT_CONFIG;

export interface RateLimitResult {
  /** Whether the action is allowed */
  allowed: boolean;

  /** Number of remaining calls in current window */
  remaining: number;

  /** Timestamp when the limit will reset (Unix ms) */
  resetAt: number;

  /** Human-readable message (if denied) */
  message?: string;
}

/**
 * Check rate limit for a user and action type
 *
 * Uses sliding window algorithm:
 * 1. Fetch existing rate limit record
 * 2. Filter out timestamps older than window
 * 3. Check if count < limit
 * 4. If allowed: add new timestamp and update record
 *
 * @param ctx - Convex mutation context
 * @param clerkUserId - The Clerk user ID to check
 * @param actionType - Type of action ('llm_call', 'profile_update')
 * @returns RateLimitResult
 */
export async function checkRateLimit(
  ctx: GenericMutationCtx<DataModel>,
  clerkUserId: string,
  actionType: ActionType,
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIG[actionType];
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Fetch existing rate limit record
  const existing = await ctx.db
    .query('rateLimits')
    .withIndex('by_clerk_user_action', (q) =>
      q.eq('clerkUserId', clerkUserId).eq('actionType', actionType),
    )
    .first();

  // Filter recent calls within window (sliding window)
  const recentCalls = existing
    ? existing.calls.filter((timestamp) => timestamp >= windowStart)
    : [];

  const callCount = recentCalls.length;
  const allowed = callCount < config.maxCalls;

  // Calculate remaining and resetAt
  const remaining = Math.max(0, config.maxCalls - callCount);

  // resetAt is when the oldest call in window will expire
  const oldestCall = recentCalls[0] || now;
  const resetAt = oldestCall + config.windowMs;

  // If allowed, add current timestamp
  if (allowed) {
    const updatedCalls = [...recentCalls, now];

    if (existing) {
      await ctx.db.patch(existing._id, {
        calls: updatedCalls,
        windowStart,
      });
    } else {
      await ctx.db.insert('rateLimits', {
        clerkUserId,
        actionType,
        calls: updatedCalls,
        windowStart,
      });
    }
  }

  return {
    allowed,
    remaining: allowed ? remaining - 1 : remaining, // Subtract 1 if we just consumed a call
    resetAt,
    message: allowed
      ? undefined
      : `Rate limit exceeded. You can try again in ${Math.ceil((resetAt - now) / 1000)} seconds.`,
  };
}

/**
 * Check rate limit without incrementing (query-only)
 *
 * Use this for read-only checks (e.g., showing user their remaining quota).
 *
 * @param ctx - Convex query context
 * @param clerkUserId - The Clerk user ID to check
 * @param actionType - Type of action
 * @returns RateLimitResult (without incrementing)
 */
export async function getRateLimitStatus(
  ctx: GenericQueryCtx<DataModel>,
  clerkUserId: string,
  actionType: ActionType,
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIG[actionType];
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const existing = await ctx.db
    .query('rateLimits')
    .withIndex('by_clerk_user_action', (q) =>
      q.eq('clerkUserId', clerkUserId).eq('actionType', actionType),
    )
    .first();

  const recentCalls = existing
    ? existing.calls.filter((timestamp) => timestamp >= windowStart)
    : [];

  const callCount = recentCalls.length;
  const allowed = callCount < config.maxCalls;
  const remaining = Math.max(0, config.maxCalls - callCount);
  const oldestCall = recentCalls[0] || now;
  const resetAt = oldestCall + config.windowMs;

  return {
    allowed,
    remaining,
    resetAt,
    message: allowed
      ? undefined
      : `Rate limit exceeded. You can try again in ${Math.ceil((resetAt - now) / 1000)} seconds.`,
  };
}

/**
 * Reset rate limit for a user (admin/testing only)
 *
 * @param ctx - Convex mutation context
 * @param clerkUserId - The Clerk user ID to reset
 * @param actionType - Type of action to reset
 */
export async function resetRateLimit(
  ctx: GenericMutationCtx<DataModel>,
  clerkUserId: string,
  actionType: ActionType,
): Promise<void> {
  const existing = await ctx.db
    .query('rateLimits')
    .withIndex('by_clerk_user_action', (q) =>
      q.eq('clerkUserId', clerkUserId).eq('actionType', actionType),
    )
    .first();

  if (existing) {
    await ctx.db.delete(existing._id);
  }
}
