import { query, mutation, internalQuery, internalMutation } from '../_generated/server';
import { v } from 'convex/values';
import { assertAdmin } from '../lib/roles';
import { auditLog, validateConfigValue } from '../lib/adminGuards';

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('adminConfig'),
      _creationTime: v.number(),
      key: v.string(),
      value: v.string(),
      updatedBy: v.string(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await assertAdmin(ctx);
    return await ctx.db.query('adminConfig').collect();
  },
});

export const get = query({
  args: { key: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { key }) => {
    await assertAdmin(ctx);
    const row = await ctx.db
      .query('adminConfig')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();
    return row?.value ?? null;
  },
});

// Internal query without admin check — for use by internal actions (e.g., courseAi)
export const getInternal = internalQuery({
  args: { key: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query('adminConfig')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();
    return row?.value ?? null;
  },
});

// Internal mutation without admin check — for use by internal actions (e.g., font caching)
export const setInternal = internalMutation({
  args: { key: v.string(), value: v.string() },
  returns: v.null(),
  handler: async (ctx, { key, value }) => {
    const existing = await ctx.db
      .query('adminConfig')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value,
        updatedBy: 'system',
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('adminConfig', {
        key,
        value,
        updatedBy: 'system',
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const set = mutation({
  args: { key: v.string(), value: v.string() },
  returns: v.null(),
  handler: async (ctx, { key, value }) => {
    const { subject: actor } = await assertAdmin(ctx);
    validateConfigValue(key, value);

    const existing = await ctx.db
      .query('adminConfig')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();

    const oldValue = existing?.value;

    if (existing) {
      await ctx.db.patch(existing._id, {
        value,
        updatedBy: actor,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('adminConfig', {
        key,
        value,
        updatedBy: actor,
        updatedAt: Date.now(),
      });
    }

    await auditLog(ctx, actor, 'config.set', key, {
      oldValue: oldValue ?? null,
      newValue: value,
    });
    return null;
  },
});
