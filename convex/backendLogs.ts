import { query, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { assertAdmin } from './lib/roles';
import { ConfigKey } from './lib/config';
import { getConfigValueFromDb } from './lib/dbHelpers';

const MAX_LOGS = 100;

const logLevelValidator = v.union(v.literal('log'), v.literal('warn'), v.literal('error'));

// Internal mutation to store backend logs (called from logger)
export const storeBackendLog = internalMutation({
  args: {
    level: logLevelValidator,
    source: v.string(),
    message: v.string(),
    data: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if DB logging is enabled
    const dbLoggingEnabled =
      (await getConfigValueFromDb(ctx, ConfigKey.DEBUG_DB_LOGGING)) === 'true';
    if (!dbLoggingEnabled) {
      return null;
    }

    // Keep only last MAX_LOGS to avoid bloat
    const existingLogs = await ctx.db
      .query('backendLogs')
      .withIndex('by_timestamp')
      .order('desc')
      .collect();

    if (existingLogs.length >= MAX_LOGS) {
      const toDelete = existingLogs.slice(MAX_LOGS - 1);
      for (const log of toDelete) {
        await ctx.db.delete(log._id);
      }
    }

    await ctx.db.insert('backendLogs', {
      level: args.level,
      source: args.source,
      message: args.message,
      data: args.data,
      timestamp: Date.now(),
    });

    return null;
  },
});

// Query to fetch backend logs (admin only)
export const getBackendLogs = query({
  args: {
    limit: v.optional(v.number()),
    level: v.optional(logLevelValidator),
  },
  returns: v.array(
    v.object({
      _id: v.id('backendLogs'),
      _creationTime: v.number(),
      level: logLevelValidator,
      source: v.string(),
      message: v.string(),
      data: v.optional(v.string()),
      timestamp: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const limit = args.limit ?? 50;

    if (args.level) {
      return await ctx.db
        .query('backendLogs')
        .withIndex('by_level', (q) => q.eq('level', args.level!))
        .order('desc')
        .take(limit);
    }

    return await ctx.db.query('backendLogs').withIndex('by_timestamp').order('desc').take(limit);
  },
});

// Get unique sources for filtering (admin only)
export const getSources = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    await assertAdmin(ctx);

    const logs = await ctx.db.query('backendLogs').collect();
    const sources = new Set(logs.map((l) => l.source));
    return Array.from(sources).sort();
  },
});

// Clear all logs (admin only - useful for cleanup)
export const clearLogs = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const all = await ctx.db.query('backendLogs').collect();
    for (const log of all) {
      await ctx.db.delete(log._id);
    }
    return all.length;
  },
});
