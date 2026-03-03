import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { ConfigKey, DEFAULT_CONFIG } from './lib/config';

/**
 * Seed staging database with minimal test data.
 * Run once after creating a new Convex staging project:
 *
 *   npx convex run --prod seed:seedStaging
 *
 * This is an internalMutation — can only be called from the Convex dashboard
 * or via `npx convex run`. Not exposed as a public API.
 */

// Staging-specific overrides on top of DEFAULT_CONFIG
const STAGING_OVERRIDES: Partial<Record<ConfigKey, string>> = {
  [ConfigKey.DEBUG_DB_LOGGING]: 'true',
};

export const seedStaging = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    for (const key of Object.values(ConfigKey)) {
      const existing = await ctx.db
        .query('config')
        .withIndex('by_key', (q) => q.eq('key', key))
        .unique();

      if (!existing) {
        const defaults = DEFAULT_CONFIG[key];
        await ctx.db.insert('config', {
          type: defaults.type,
          key,
          value: STAGING_OVERRIDES[key] ?? defaults.value,
        });
      }
    }

    return null;
  },
});
