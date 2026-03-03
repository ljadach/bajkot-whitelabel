import { query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Public query to look up processed video cloudflareStreamUid by fileName.
 * Used by lesson reader to render inline video embeds.
 * Requires authentication — video URLs should not be exposed to anonymous users.
 */
export const getVideoStreamMap = query({
  args: {},
  returns: v.array(
    v.object({
      fileName: v.string(),
      cloudflareStreamUid: v.string(),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const videos = await ctx.db
      .query('pipelineVideos')
      .withIndex('by_status', (q) => q.eq('status', 'processed'))
      .collect();

    return videos
      .filter((v) => v.cloudflareStreamUid)
      .map((v) => ({
        fileName: v.fileName,
        cloudflareStreamUid: v.cloudflareStreamUid!,
      }));
  },
});
