import { query, mutation, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { assertAdmin } from './lib/roles';

// Internal mutation to store LLM logs (called from actions)
export const storeLlmLog = internalMutation({
  args: {
    clerkUserId: v.string(),
    action: v.string(),
    model: v.string(),
    systemPrompt: v.string(),
    userPrompt: v.string(),
    response: v.optional(v.string()),
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    webSearchUsed: v.optional(v.boolean()),
    webSearchSources: v.optional(v.array(v.string())),
    reasoningUsed: v.optional(v.boolean()),
  },
  returns: v.id('llmLogs'),
  handler: async (ctx, args) => {
    // Keep only last 50 logs per user to avoid bloat
    const existingLogs = await ctx.db
      .query('llmLogs')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', args.clerkUserId))
      .order('desc')
      .collect();

    if (existingLogs.length >= 50) {
      // Delete oldest logs beyond 50
      const toDelete = existingLogs.slice(49);
      for (const log of toDelete) {
        await ctx.db.delete(log._id);
      }
    }

    return await ctx.db.insert('llmLogs', {
      clerkUserId: args.clerkUserId,
      action: args.action,
      model: args.model,
      systemPrompt: args.systemPrompt,
      userPrompt: args.userPrompt,
      response: args.response,
      error: args.error,
      durationMs: args.durationMs,
      webSearchUsed: args.webSearchUsed,
      webSearchSources: args.webSearchSources,
      reasoningUsed: args.reasoningUsed,
      timestamp: Date.now(),
    });
  },
});

// Query to fetch LLM logs (admin only - for debugging)
export const getLlmLogs = query({
  args: {
    limit: v.optional(v.number()),
    clerkUserId: v.optional(v.string()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Admin only - debug functionality
    await assertAdmin(ctx);

    const identity = await ctx.auth.getUserIdentity();
    const limit = args.limit ?? 20;
    const targetUserId = args.clerkUserId || identity!.subject;

    const logs = await ctx.db
      .query('llmLogs')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', targetUserId))
      .order('desc')
      .take(limit);

    return logs;
  },
});

// Query to get all users who have LLM logs (admin only - for debug user switcher)
export const getAllLogUsers = query({
  args: {},
  returns: v.array(
    v.object({
      clerkUserId: v.string(),
      logCount: v.number(),
      lastActivity: v.number(),
    }),
  ),
  handler: async (ctx) => {
    // Admin only - debug functionality
    await assertAdmin(ctx);

    // Get all unique clerkUserIds from logs
    const allLogs = await ctx.db.query('llmLogs').collect();
    const userMap = new Map<
      string,
      { clerkUserId: string; logCount: number; lastActivity: number }
    >();

    for (const log of allLogs) {
      // Skip logs without clerkUserId (legacy data)
      if (!log.clerkUserId) continue;

      const existing = userMap.get(log.clerkUserId);
      if (existing) {
        existing.logCount++;
        existing.lastActivity = Math.max(existing.lastActivity, log.timestamp);
      } else {
        userMap.set(log.clerkUserId, {
          clerkUserId: log.clerkUserId,
          logCount: 1,
          lastActivity: log.timestamp,
        });
      }
    }

    // Convert to array and sort alphabetically by clerkUserId
    return Array.from(userMap.values()).sort((a, b) => a.clerkUserId.localeCompare(b.clerkUserId));
  },
});

// Mutation to delete all LLM logs for a given user (admin only)
export const deleteLlmLogsForUser = mutation({
  args: {
    clerkUserId: v.optional(v.string()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const identity = await ctx.auth.getUserIdentity();
    const targetUserId = args.clerkUserId || identity!.subject;

    const logs = await ctx.db
      .query('llmLogs')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', targetUserId))
      .collect();

    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    return logs.length;
  },
});

// Query to fetch a single log by ID (admin only - for debugging)
export const getLlmLogById = query({
  args: {
    logId: v.id('llmLogs'),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    // Admin only - debug functionality
    await assertAdmin(ctx);

    const log = await ctx.db.get(args.logId);
    return log;
  },
});
