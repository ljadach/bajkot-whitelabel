import { query, mutation, internalMutation, internalQuery } from '../_generated/server';
import { api } from '../_generated/api';
import { v } from 'convex/values';
import { assertAdmin } from '../lib/roles';
import { auditLog } from '../lib/adminGuards';
import { simpleHash } from '../lib/googleDrive';

// ── Queries ───────────────────────────────────────────────────

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('pipelineVideos'),
      _creationTime: v.number(),
      fileName: v.string(),
      fileHash: v.string(),
      sourceUrl: v.optional(v.string()),
      googleDriveFileId: v.optional(v.string()),
      durationSeconds: v.optional(v.number()),
      fileSizeBytes: v.optional(v.number()),
      status: v.union(v.literal('new'), v.literal('processing'), v.literal('processed'), v.literal('failed')),
      error: v.optional(v.string()),
      toolDetected: v.optional(v.string()),
      uiVersion: v.optional(v.string()),
      cloudflareStreamUid: v.optional(v.string()),
      cloudflareError: v.optional(v.string()),
      addedBy: v.string(),
      processedAt: v.optional(v.number()),
      createdAt: v.number(),
      segmentCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const videos = await ctx.db.query('pipelineVideos').collect();

    const results = await Promise.all(
      videos.map(async (video) => {
        const segments = await ctx.db
          .query('videoSegments')
          .withIndex('by_video', (q) => q.eq('videoId', video._id))
          .collect();
        return { ...video, segmentCount: segments.length };
      })
    );

    return results;
  },
});

export const getById = query({
  args: { videoId: v.id('pipelineVideos') },
  returns: v.union(
    v.object({
      _id: v.id('pipelineVideos'),
      _creationTime: v.number(),
      fileName: v.string(),
      fileHash: v.string(),
      sourceUrl: v.optional(v.string()),
      googleDriveFileId: v.optional(v.string()),
      durationSeconds: v.optional(v.number()),
      fileSizeBytes: v.optional(v.number()),
      status: v.union(v.literal('new'), v.literal('processing'), v.literal('processed'), v.literal('failed')),
      error: v.optional(v.string()),
      toolDetected: v.optional(v.string()),
      uiVersion: v.optional(v.string()),
      cloudflareStreamUid: v.optional(v.string()),
      cloudflareError: v.optional(v.string()),
      addedBy: v.string(),
      processedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, { videoId }) => {
    await assertAdmin(ctx);
    return await ctx.db.get(videoId);
  },
});

// ── Mutations ─────────────────────────────────────────────────

export const add = mutation({
  args: {
    fileName: v.string(),
    sourceUrl: v.optional(v.string()),
    googleDriveFileId: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    fileSizeBytes: v.optional(v.number()),
  },
  returns: v.id('pipelineVideos'),
  handler: async (ctx, args) => {
    const { subject: actor } = await assertAdmin(ctx);

    const sizeStr = String(args.durationSeconds ?? args.fileSizeBytes ?? 0);
    const fileHash = simpleHash(args.fileName + ':' + sizeStr);

    const existing = await ctx.db
      .query('pipelineVideos')
      .withIndex('by_hash', (q) => q.eq('fileHash', fileHash))
      .first();

    if (existing) {
      return existing._id;
    }

    const id = await ctx.db.insert('pipelineVideos', {
      fileName: args.fileName,
      fileHash,
      sourceUrl: args.sourceUrl,
      googleDriveFileId: args.googleDriveFileId,
      durationSeconds: args.durationSeconds,
      fileSizeBytes: args.fileSizeBytes,
      status: 'new',
      addedBy: actor,
      createdAt: Date.now(),
    });
    await auditLog(ctx, actor, 'video.add', id, { fileName: args.fileName });
    return id;
  },
});

export const remove = mutation({
  args: { videoId: v.id('pipelineVideos') },
  returns: v.null(),
  handler: async (ctx, { videoId }) => {
    const { subject: actor } = await assertAdmin(ctx);
    const video = await ctx.db.get(videoId);
    const segments = await ctx.db
      .query('videoSegments')
      .withIndex('by_video', (q) => q.eq('videoId', videoId))
      .collect();
    for (const seg of segments) {
      await ctx.db.delete(seg._id);
    }
    await ctx.db.delete(videoId);
    await auditLog(ctx, actor, 'video.remove', videoId, {
      fileName: video?.fileName,
      segmentsDeleted: segments.length,
    });
    return null;
  },
});

export const updateStatus = internalMutation({
  args: {
    videoId: v.id('pipelineVideos'),
    status: v.union(v.literal('new'), v.literal('processing'), v.literal('processed'), v.literal('failed')),
    error: v.optional(v.string()),
    toolDetected: v.optional(v.string()),
    uiVersion: v.optional(v.string()),
    cloudflareStreamUid: v.optional(v.string()),
    cloudflareError: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { videoId, ...fields }) => {
    await ctx.db.patch(videoId, {
      ...fields,
      ...(fields.status === 'processed' ? { processedAt: Date.now() } : {}),
    });
    return null;
  },
});

export const insertSegments = internalMutation({
  args: {
    videoId: v.id('pipelineVideos'),
    segments: v.array(
      v.object({
        start: v.number(),
        end: v.number(),
        description: v.string(),
        metadata: v.optional(v.string()),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, { videoId, segments }) => {
    const existing = await ctx.db
      .query('videoSegments')
      .withIndex('by_video', (q) => q.eq('videoId', videoId))
      .collect();
    for (const seg of existing) {
      await ctx.db.delete(seg._id);
    }

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      await ctx.db.insert('videoSegments', {
        videoId,
        startSeconds: seg.start,
        endSeconds: seg.end,
        description: seg.description,
        metadata: seg.metadata,
        enabled: true,
        tags: [],
        order: i,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});

// Internal query without auth for backfill
export const _getByIdInternal = internalQuery({
  args: { videoId: v.id('pipelineVideos') },
  returns: v.union(
    v.object({
      _id: v.id('pipelineVideos'),
      _creationTime: v.number(),
      fileName: v.string(),
      fileHash: v.string(),
      sourceUrl: v.optional(v.string()),
      googleDriveFileId: v.optional(v.string()),
      durationSeconds: v.optional(v.number()),
      fileSizeBytes: v.optional(v.number()),
      status: v.union(v.literal('new'), v.literal('processing'), v.literal('processed'), v.literal('failed')),
      error: v.optional(v.string()),
      toolDetected: v.optional(v.string()),
      uiVersion: v.optional(v.string()),
      cloudflareStreamUid: v.optional(v.string()),
      cloudflareError: v.optional(v.string()),
      addedBy: v.string(),
      processedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, { videoId }) => {
    return await ctx.db.get(videoId);
  },
});
