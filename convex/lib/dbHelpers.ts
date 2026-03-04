/**
 * Database helper functions to reduce boilerplate in queries and mutations.
 */

import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { DataModel } from '../_generated/dataModel';
import { ConfigKey, DEFAULT_CONFIG } from './config';

type DbCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

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
