import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { getProfileByClerkUserId } from './lib/dbHelpers';

// Internal mutation to save quick tip to user profile
export const saveQuickTip = internalMutation({
  args: {
    clerkUserId: v.string(),
    hook: v.string(),
    content: v.string(),
    sources: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await getProfileByClerkUserId(ctx, args.clerkUserId);

    if (!profile) {
      throw new Error('Profile not found');
    }

    await ctx.db.patch(profile._id, {
      quickTip: {
        hook: args.hook,
        content: args.content,
        generatedAt: Date.now(),
        searchSources: args.sources.length > 0 ? args.sources : undefined,
      },
    });

    return null;
  },
});
