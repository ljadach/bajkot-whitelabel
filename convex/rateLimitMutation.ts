/**
 * Rate Limit Mutations
 *
 * Internal mutations for rate limiting that can be called from actions.
 */

import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { checkRateLimit, ActionType } from './lib/rateLimiter';
import { ConvexError } from 'convex/values';

/**
 * Check and record rate limit for current user
 *
 * This internal mutation can be called from actions to enforce rate limiting.
 * Throws ConvexError if rate limit is exceeded.
 *
 * @param actionType - Type of action to rate limit
 * @param clerkUserId - Clerk user ID
 * @throws ConvexError if rate limit exceeded
 */
export const checkAndRecordLLMRateLimit = internalMutation({
  args: {
    actionType: v.union(
      v.literal('llm_call'),
      v.literal('profile_update'),
      v.literal('landing_order'),
    ),
    clerkUserId: v.string(),
  },
  returns: v.object({
    allowed: v.boolean(),
    remaining: v.number(),
    resetAt: v.number(),
    clerkUserId: v.string(),
  }),
  handler: async (ctx, { actionType, clerkUserId }) => {
    const result = await checkRateLimit(ctx, clerkUserId, actionType as ActionType);

    if (!result.allowed) {
      throw new ConvexError({
        code: 'RATE_LIMIT_EXCEEDED',
        message: result.message || 'Rate limit exceeded',
        resetAt: result.resetAt,
        remaining: result.remaining,
      });
    }

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: result.resetAt,
      clerkUserId,
    };
  },
});
