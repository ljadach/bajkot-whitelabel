import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { getProfileByClerkUserId } from './lib/dbHelpers';

export const saveDiaryEntry = internalMutation({
  args: {
    clerkUserId: v.string(),
    title: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await getProfileByClerkUserId(ctx, args.clerkUserId);

    if (!profile) {
      throw new Error('Profile not found');
    }

    await ctx.db.patch(profile._id, {
      diaryEntry: {
        title: args.title,
        content: args.content,
        generatedAt: Date.now(),
      },
    });

    return null;
  },
});
