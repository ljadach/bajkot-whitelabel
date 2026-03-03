/**
 * Database helper functions to reduce boilerplate in queries and mutations.
 */

import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { DataModel, Doc, Id } from '../_generated/dataModel';
import { ConfigKey, DEFAULT_CONFIG } from './config';

type DbCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

/**
 * Get user profile by Clerk user ID.
 * Returns null if not found.
 */
export async function getProfileByClerkUserId(ctx: DbCtx, clerkUserId: string): Promise<Doc<'userProfiles'> | null> {
  return await ctx.db
    .query('userProfiles')
    .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', clerkUserId))
    .first();
}

/**
 * Get user profile for the authenticated user.
 * Returns null if not authenticated or profile not found.
 */
export async function getAuthenticatedProfile(ctx: DbCtx): Promise<Doc<'userProfiles'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return getProfileByClerkUserId(ctx, identity.subject);
}

/**
 * Get organization membership for a user with manager/admin role check.
 * Returns the membership if user is admin or manager, null otherwise.
 */
export async function getOrgManagerOrAdminMembership(ctx: DbCtx, organizationId: Id<'organizations'>, clerkUserId: string): Promise<Doc<'organizationMembers'> | null> {
  const membership = await ctx.db
    .query('organizationMembers')
    .withIndex('by_org_user', (q) => q.eq('organizationId', organizationId).eq('clerkUserId', clerkUserId))
    .first();

  if (!membership || membership.role === 'member') {
    return null;
  }
  return membership;
}

/**
 * Get config value directly from database.
 * Use this in queries/mutations where you don't have ActionCtx.
 * For actions, prefer getConfigValue from configClient.ts.
 */
export async function getConfigValueFromDb(ctx: DbCtx, key: ConfigKey): Promise<string> {
  const doc = await ctx.db
    .query('config')
    .withIndex('by_key', (q) => q.eq('key', key))
    .unique();
  return doc?.value ?? DEFAULT_CONFIG[key]?.value ?? '';
}
