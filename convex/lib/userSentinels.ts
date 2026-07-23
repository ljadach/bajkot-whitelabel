/**
 * Synthetic clerkUserId sentinels for orders created outside the normal
 * Clerk auth flow. Pure module — importable from both Convex functions and
 * the frontend (roles.ts re-exports LANDING_USER_ID for backend callers).
 */

export const LANDING_USER_ID = 'landing-user' as const;
export const CLI_USER_ID = 'cli-user' as const;
