import { query } from './_generated/server';
import { v } from 'convex/values';
import { isAdmin as checkIsAdmin } from './lib/roles';

/**
 * Get the currently logged in user's identity from Clerk
 */
export const loggedInUser = query({
  args: {},
  returns: v.union(
    v.object({
      clerkUserId: v.string(),
      tokenIdentifier: v.string(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      pictureUrl: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    // Return Clerk identity info
    return {
      clerkUserId: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name ?? undefined,
      email: identity.email ?? undefined,
      pictureUrl: identity.pictureUrl ?? undefined,
    };
  },
});

/**
 * Check if the current user has admin role
 * Uses Clerk JWT custom claim (isAdmin from publicMetadata)
 */
export const isAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    return await checkIsAdmin(ctx);
  },
});
