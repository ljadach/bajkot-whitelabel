import type { ActionCtx } from '../_generated/server';
import { api } from '../_generated/api';
import { ConfigKey, DEFAULT_CONFIG } from './config';

export async function getConfigValue(ctx: ActionCtx, key: ConfigKey): Promise<string> {
  const value = await ctx.runQuery(api.config.get, { key });
  if (value !== null && value !== undefined) {
    return value;
  }
  return DEFAULT_CONFIG[key]?.value ?? '';
}

export async function setConfigValue(ctx: ActionCtx, key: ConfigKey, value: string): Promise<void> {
  await ctx.runMutation(api.config.set, { key, value });
}
