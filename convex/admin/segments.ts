import { query, mutation } from '../_generated/server';
import { v } from 'convex/values';
import { assertAdmin } from '../lib/roles';
import { assertBulkLimit, auditLog } from '../lib/adminGuards';

export const listByVideo = query({
  args: { videoId: v.id('pipelineVideos') },
  returns: v.array(
    v.object({
      _id: v.id('videoSegments'),
      _creationTime: v.number(),
      videoId: v.id('pipelineVideos'),
      startSeconds: v.number(),
      endSeconds: v.number(),
      description: v.string(),
      metadata: v.optional(v.string()),
      enabled: v.boolean(),
      tags: v.array(v.string()),
      order: v.number(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, { videoId }) => {
    await assertAdmin(ctx);
    return await ctx.db
      .query('videoSegments')
      .withIndex('by_video_order', (q) => q.eq('videoId', videoId))
      .collect();
  },
});

export const listAll = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('videoSegments'),
      _creationTime: v.number(),
      videoId: v.id('pipelineVideos'),
      startSeconds: v.number(),
      endSeconds: v.number(),
      description: v.string(),
      metadata: v.optional(v.string()),
      enabled: v.boolean(),
      tags: v.array(v.string()),
      order: v.number(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    await assertAdmin(ctx);
    return await ctx.db.query('videoSegments').collect();
  },
});

export const toggle = mutation({
  args: { segmentId: v.id('videoSegments'), enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { segmentId, enabled }) => {
    await assertAdmin(ctx);
    await ctx.db.patch(segmentId, { enabled });
    return null;
  },
});

export const bulkToggle = mutation({
  args: {
    segmentIds: v.array(v.id('videoSegments')),
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { segmentIds, enabled }) => {
    await assertAdmin(ctx);
    assertBulkLimit(segmentIds, 'segments');
    for (const id of segmentIds) {
      await ctx.db.patch(id, { enabled });
    }
    return null;
  },
});

export const setTags = mutation({
  args: { segmentId: v.id('videoSegments'), tags: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, { segmentId, tags }) => {
    await assertAdmin(ctx);
    await ctx.db.patch(segmentId, { tags });
    return null;
  },
});

export const bulkSetTags = mutation({
  args: {
    segmentIds: v.array(v.id('videoSegments')),
    tags: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { segmentIds, tags }) => {
    await assertAdmin(ctx);
    assertBulkLimit(segmentIds, 'segments');
    for (const id of segmentIds) {
      await ctx.db.patch(id, { tags });
    }
    return null;
  },
});

export const addTag = mutation({
  args: { segmentId: v.id('videoSegments'), tag: v.string() },
  returns: v.null(),
  handler: async (ctx, { segmentId, tag }) => {
    await assertAdmin(ctx);
    validateTag(tag);
    const seg = await ctx.db.get(segmentId);
    if (!seg) throw new Error('Segment not found');
    const tags = seg.tags.includes(tag) ? seg.tags : [...seg.tags, tag];
    await ctx.db.patch(segmentId, { tags });
    return null;
  },
});

export const bulkAddTag = mutation({
  args: {
    segmentIds: v.array(v.id('videoSegments')),
    tag: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { segmentIds, tag }) => {
    await assertAdmin(ctx);
    assertBulkLimit(segmentIds, 'segments');
    validateTag(tag);
    for (const id of segmentIds) {
      const seg = await ctx.db.get(id);
      if (!seg) continue;
      const tags = seg.tags.includes(tag) ? seg.tags : [...seg.tags, tag];
      await ctx.db.patch(id, { tags });
    }
    return null;
  },
});

export const updateDescription = mutation({
  args: { segmentId: v.id('videoSegments'), description: v.string() },
  returns: v.null(),
  handler: async (ctx, { segmentId, description }) => {
    await assertAdmin(ctx);
    if (description.length > 5000) {
      throw new Error('Description too long (max 5000 characters)');
    }
    await ctx.db.patch(segmentId, { description });
    return null;
  },
});

export const remove = mutation({
  args: { segmentId: v.id('videoSegments') },
  returns: v.null(),
  handler: async (ctx, { segmentId }) => {
    const { subject } = await assertAdmin(ctx);
    const seg = await ctx.db.get(segmentId);
    if (!seg) throw new Error('Segment not found');
    await ctx.db.delete(segmentId);
    await auditLog(ctx, subject, 'segment.delete', segmentId, {
      videoId: seg.videoId,
      description: seg.description.slice(0, 100),
    });
    return null;
  },
});

export const bulkRemove = mutation({
  args: { segmentIds: v.array(v.id('videoSegments')) },
  returns: v.null(),
  handler: async (ctx, { segmentIds }) => {
    const { subject } = await assertAdmin(ctx);
    assertBulkLimit(segmentIds, 'segments');
    for (const id of segmentIds) {
      const seg = await ctx.db.get(id);
      if (!seg) continue;
      await ctx.db.delete(id);
    }
    await auditLog(ctx, subject, 'segment.bulkDelete', undefined, {
      count: segmentIds.length,
    });
    return null;
  },
});

function validateTag(tag: string) {
  if (!tag.trim() || tag.length > 50 || !/^[a-zA-Z0-9_-]+$/.test(tag)) {
    throw new Error('Invalid tag: use alphanumeric characters, underscores, hyphens (max 50 chars)');
  }
}
