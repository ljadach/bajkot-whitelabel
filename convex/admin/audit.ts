/**
 * Generic audit-log writer for admin actions that live in 'use node' files
 * (those can only export actions, so they can't call auditLog directly).
 */

import { internalMutation } from '../_generated/server';
import { v } from 'convex/values';
import { auditLog } from '../lib/adminGuards';

export const logAdminAction = internalMutation({
  args: {
    actor: v.string(),
    action: v.string(),
    target: v.optional(v.string()),
    details: v.optional(v.record(v.string(), v.any())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await auditLog(ctx, args.actor, args.action, args.target, args.details);
    return null;
  },
});
