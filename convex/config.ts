import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { ConfigKey, ConfigType, DEFAULT_CONFIG, isConfigKey } from './lib/config';
import { assertAdmin } from './lib/roles';

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Admin only - debug functionality
    await assertAdmin(ctx);

    const docs = await ctx.db.query('config').collect();
    const map = new Map(docs.map((doc) => [doc.key as ConfigKey, doc]));
    return Object.values(ConfigKey).map((key) => {
      const doc = map.get(key);
      if (doc) {
        return {
          key,
          type: doc.type as ConfigType,
          value: doc.value,
        };
      }
      const defaults = DEFAULT_CONFIG[key];
      return {
        key,
        type: defaults?.type ?? ConfigType.SYSTEM,
        value: defaults?.value ?? '',
      };
    });
  },
});

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    if (!isConfigKey(args.key)) {
      throw new Error(`Invalid config key: ${args.key}`);
    }
    const doc = await ctx.db
      .query('config')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .unique();
    if (doc) {
      return doc.value;
    }
    return DEFAULT_CONFIG[args.key as ConfigKey]?.value ?? null;
  },
});

export const set = mutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    // Admin only - debug functionality
    await assertAdmin(ctx);

    if (!isConfigKey(args.key)) {
      throw new Error(`Invalid config key: ${args.key}`);
    }
    const existing = await ctx.db
      .query('config')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      const defaults = DEFAULT_CONFIG[args.key as ConfigKey];
      await ctx.db.insert('config', {
        type: defaults?.type ?? ConfigType.SYSTEM,
        key: args.key as ConfigKey,
        value: args.value,
      });
    }
    return args.value;
  },
});
