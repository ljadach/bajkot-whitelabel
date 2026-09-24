import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

// Internal mutation to store LLM logs (called from actions). Read them with
// `npm run cli -- logs` — there is no admin panel in the white-label build.
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
    finishReason: v.optional(v.string()),
    safetyBlockReason: v.optional(v.string()),
    retryCount: v.optional(v.number()),
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
      finishReason: args.finishReason,
      safetyBlockReason: args.safetyBlockReason,
      retryCount: args.retryCount,
      timestamp: Date.now(),
    });
  },
});
