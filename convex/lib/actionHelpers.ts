/**
 * Helper functions for Convex actions.
 * Reduces boilerplate in LLM-related actions.
 */

import { GenericActionCtx } from 'convex/server';
import { internal } from '../_generated/api';
import { DataModel } from '../_generated/dataModel';
import { LlmLogContext } from './llmClient';

type ActionCtx = GenericActionCtx<DataModel>;

export interface AuthenticatedLlmContext {
  clerkUserId: string;
  logContext: LlmLogContext;
}

/**
 * Prepare context for an authenticated LLM action.
 * Handles: authentication check, rate limiting, log context.
 * Model is resolved per-stage from pipelineConfig — no global model needed.
 */
export async function prepareAuthenticatedLlmAction(ctx: ActionCtx): Promise<AuthenticatedLlmContext> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Not authenticated');
  }
  const clerkUserId = identity.subject;

  await ctx.runMutation(internal.rateLimitMutation.checkAndRecordLLMRateLimit, {
    actionType: 'llm_call',
    clerkUserId,
  });

  const logContext: LlmLogContext = { ctx, clerkUserId };

  return { clerkUserId, logContext };
}

/** Build LlmLogContext for internal actions (no auth check). */
export function buildInternalLogContext(ctx: ActionCtx, clerkUserId: string): LlmLogContext {
  return { ctx, clerkUserId };
}
