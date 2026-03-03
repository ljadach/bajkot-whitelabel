import { action } from './_generated/server';
import { v } from 'convex/values';
import { fetchPrompt } from './lib/langfusePrompts';
import { assertAdmin } from './lib/roles';

export const getPrompt = action({
  args: {
    name: v.string(),
    label: v.optional(v.string()),
    type: v.optional(v.union(v.literal('text'), v.literal('chat'))),
    variables: v.optional(v.record(v.string(), v.string())),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const prompt = await fetchPrompt(args.name, {
      label: args.label,
      type: args.type ?? 'text',
      variables: args.variables ?? undefined,
    });
    if (!prompt) {
      return null;
    }
    return prompt;
  },
});
