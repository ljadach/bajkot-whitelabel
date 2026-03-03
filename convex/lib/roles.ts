/**
 * Role-based Access Control Helpers
 *
 * Uses Clerk JWT custom claims for role verification.
 *
 * Setup in Clerk Dashboard:
 * 1. Go to JWT Templates → edit "convex" template
 * 2. Add custom claim: "isAdmin": "{{user.public_metadata.isAdmin}}"
 * 3. For admin users, set publicMetadata.isAdmin = true in Users section
 *
 * The isAdmin claim will then be available on the identity object in Convex.
 */

import { GenericActionCtx, GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { DataModel } from '../_generated/dataModel';

export type Role = 'admin';

type AnyCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel> | GenericActionCtx<DataModel>;

/**
 * Get the current user's identity or null if not authenticated
 */
async function getIdentity(ctx: AnyCtx) {
  return await ctx.auth.getUserIdentity();
}

/**
 * Check if the current user has a specific role
 *
 * @param ctx - Convex context (query, mutation, or action)
 * @param role - Role to check ('admin')
 * @returns true if user has the role, false otherwise
 */
export async function hasRole(ctx: AnyCtx, role: Role): Promise<boolean> {
  const identity = await getIdentity(ctx);
  if (!identity) {
    return false;
  }

  switch (role) {
    case 'admin':
      // Access custom claim from Clerk JWT
      return (identity as any).isAdmin === true;
    default:
      return false;
  }
}

/**
 * Check if the current user is an admin
 *
 * @param ctx - Convex context (query, mutation, or action)
 * @returns true if user is admin, false otherwise
 */
export async function isAdmin(ctx: AnyCtx): Promise<boolean> {
  return hasRole(ctx, 'admin');
}

/**
 * Assert that the current user has a specific role
 * Throws an error if the user doesn't have the required role
 *
 * @param ctx - Convex context (query, mutation, or action)
 * @param role - Role to require ('admin')
 * @throws Error if user is not authenticated or doesn't have the role
 */
export async function assertRole(ctx: AnyCtx, role: Role): Promise<void> {
  const identity = await getIdentity(ctx);
  if (!identity) {
    throw new Error('Not authenticated');
  }

  const has = await hasRole(ctx, role);
  if (!has) {
    throw new Error(`Access denied: requires ${role} role`);
  }
}

/**
 * Assert that the current user is an admin
 * Throws an error if the user is not an admin
 *
 * @param ctx - Convex context (query, mutation, or action)
 * @returns The identity subject for use by callers
 * @throws Error if user is not authenticated or not an admin
 */
export async function assertAdmin(ctx: AnyCtx): Promise<{ subject: string }> {
  const identity = await getIdentity(ctx);
  if (!identity) {
    throw new Error('Not authenticated');
  }
  const has = await hasRole(ctx, 'admin');
  if (!has) {
    throw new Error('Access denied: requires admin role');
  }
  return { subject: identity.subject };
}
