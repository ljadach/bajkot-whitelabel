import { v } from 'convex/values';
import { mutation } from './_generated/server';

const TOOL_XP: Record<string, number> = {
  probe: 5,
  contrapositor: 15,
  conceptRadar: 3,
  skeletonKeyAuto: 5,
  skeletonKeyManual: 10,
  tomorrow: 5,
  reflectionGate: 10,
  glossator: 2,
};

export const awardToolEngagement = mutation({
  args: {
    toolId: v.string(),
    score: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { toolId, score }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const clerkUserId = identity.subject;

    let xp = TOOL_XP[toolId] ?? 5;

    // Challenge bonus based on score
    if (toolId === 'contrapositor' && score) {
      if (score >= 95) xp = 50;
      else if (score >= 80) xp = 35;
      else if (score >= 60) xp = 25;
      else xp = 15;
    }

    // Log activity
    await ctx.db.insert('activityLog', {
      clerkUserId,
      activityType: 'exercise_completed',
      referenceId: toolId,
      pointsEarned: xp,
      timestamp: Date.now(),
    });

    return null;
  },
});
