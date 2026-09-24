/**
 * Helper functions for Convex actions.
 * Reduces boilerplate in LLM-related actions.
 */

import { GenericActionCtx } from 'convex/server';
import { DataModel } from '../_generated/dataModel';
import { LlmLogContext } from './llmClient';

type ActionCtx = GenericActionCtx<DataModel>;

/** Build LlmLogContext for internal actions (no auth check). */
export function buildInternalLogContext(ctx: ActionCtx, clerkUserId: string): LlmLogContext {
  return { ctx, clerkUserId };
}
