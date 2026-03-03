/**
 * Session management API for URL-based session sharing
 *
 * This module provides functionality to create shareable session tokens
 * that can be used to restore user sessions across devices via URL parameters.
 */

import { mutation, query, internalMutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Generate a shareable token for the current user
 *
 * Creates a URL-safe random token that maps to the current Clerk user.
 * Token expires in 30 days (aligned with PRD session retention policy).
 *
 * @returns {string} UUID token (without hyphens, URL-safe)
 * @throws {Error} If user is not authenticated
 */
export const createShareableToken = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated - cannot create shareable token');
    }

    const clerkUserId = identity.subject;

    // Generate crypto-random UUID and make it URL-friendly
    const shareToken = crypto.randomUUID().replace(/-/g, '');

    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    // Store token mapping
    await ctx.db.insert('sessionTokens', {
      clerkUserId,
      shareToken,
      createdAt: now,
      expiresAt: now + THIRTY_DAYS_MS,
    });

    return shareToken;
  },
});

/**
 * Validate a shareable token
 *
 * PUBLIC query - can be called without authentication.
 * Used to validate session tokens from URL parameters (?session=xyz)
 * without exposing internal user identifiers.
 *
 * @param {string} token - The shareable token from URL
 * @returns {{ valid: boolean }} Token validity status
 */
export const getSessionIdFromToken = query({
  args: { token: v.string() },
  returns: v.object({
    valid: v.boolean(),
  }),
  handler: async (ctx, { token }) => {
    const mapping = await ctx.db
      .query('sessionTokens')
      .withIndex('by_token', (q) => q.eq('shareToken', token))
      .first();

    // Check if token exists and hasn't expired
    if (!mapping || mapping.expiresAt < Date.now()) {
      return { valid: false };
    }

    return { valid: true };
  },
});

/**
 * Get information about the current authenticated user
 *
 * @returns {object | null} User info or null if not authenticated
 */
export const getCurrentSessionInfo = query({
  args: {},
  returns: v.union(
    v.object({
      clerkUserId: v.string(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return {
      clerkUserId: identity.subject,
      name: identity.name ?? undefined,
      email: identity.email ?? undefined,
    };
  },
});

/**
 * Extend session expiry by 30 days (refresh TTL)
 *
 * Can be called when user is active to extend their session tokens.
 *
 * @returns {number} New expiration timestamp
 */
export const extendSessionExpiry = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const clerkUserId = identity.subject;

    // Find all tokens for this user
    const tokens = await ctx.db
      .query('sessionTokens')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', clerkUserId))
      .collect();

    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const newExpiry = now + THIRTY_DAYS_MS;

    // Extend all tokens for this user
    for (const token of tokens) {
      await ctx.db.patch(token._id, {
        expiresAt: newExpiry,
      });
    }

    return newExpiry;
  },
});

/**
 * Clean up expired session tokens (for cron job)
 *
 * Deletes all tokens that have passed their expiry time.
 * Should be run daily.
 *
 * @returns {number} Count of deleted tokens
 */
export const cleanupExpiredTokens = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();

    // Find all expired tokens
    const expiredTokens = await ctx.db
      .query('sessionTokens')
      .withIndex('by_expires')
      .filter((q) => q.lt(q.field('expiresAt'), now))
      .collect();

    // Delete them
    for (const token of expiredTokens) {
      await ctx.db.delete(token._id);
    }

    return expiredTokens.length;
  },
});
