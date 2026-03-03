import { query, mutation, internalQuery } from '../_generated/server';
import { v } from 'convex/values';
import { assertAdmin } from '../lib/roles';
import { auditLog } from '../lib/adminGuards';
import { type CorpusSegment, buildCorpusText } from '../lib/corpusPreselection';

const corpusDocValidator = v.object({
  _id: v.id('knowledgeCorpora'),
  _creationTime: v.number(),
  version: v.number(),
  name: v.string(),
  videoIds: v.array(v.id('pipelineVideos')),
  tagFilter: v.object({
    mode: v.union(v.literal('include'), v.literal('exclude')),
    tags: v.array(v.string()),
  }),
  segmentCount: v.number(),
  content: v.string(),
  segments: v.optional(v.string()),
  createdBy: v.string(),
  createdAt: v.number(),
});

export const list = query({
  args: {},
  returns: v.array(corpusDocValidator),
  handler: async (ctx) => {
    await assertAdmin(ctx);
    return await ctx.db.query('knowledgeCorpora').withIndex('by_version').order('desc').collect();
  },
});

export const get = query({
  args: { corpusId: v.id('knowledgeCorpora') },
  returns: v.union(corpusDocValidator, v.null()),
  handler: async (ctx, { corpusId }) => {
    await assertAdmin(ctx);
    return await ctx.db.get(corpusId);
  },
});

// Internal query without admin check — for use by internal actions
export const getInternal = internalQuery({
  args: { corpusId: v.id('knowledgeCorpora') },
  returns: v.union(corpusDocValidator, v.null()),
  handler: async (ctx, { corpusId }) => {
    return await ctx.db.get(corpusId);
  },
});

export const merge = mutation({
  args: {
    videoIds: v.array(v.id('pipelineVideos')),
    tagFilter: v.object({
      mode: v.union(v.literal('include'), v.literal('exclude')),
      tags: v.array(v.string()),
    }),
  },
  returns: v.id('knowledgeCorpora'),
  handler: async (ctx, { videoIds, tagFilter }) => {
    const { subject: actor } = await assertAdmin(ctx);

    // Get latest version number
    const latest = await ctx.db.query('knowledgeCorpora').withIndex('by_version').order('desc').first();
    const nextVersion = (latest?.version ?? 0) + 1;

    // Collect segments from selected videos
    const allSegments = [];
    for (const videoId of videoIds) {
      const video = await ctx.db.get(videoId);
      if (!video) continue;

      const segments = await ctx.db
        .query('videoSegments')
        .withIndex('by_video_order', (q) => q.eq('videoId', videoId))
        .collect();

      for (const seg of segments) {
        if (!seg.enabled) continue;

        // Apply tag filter
        if (tagFilter.tags.length > 0) {
          const hasMatchingTag = seg.tags.some((t) => tagFilter.tags.includes(t));
          if (tagFilter.mode === 'include' && !hasMatchingTag) continue;
          if (tagFilter.mode === 'exclude' && hasMatchingTag) continue;
        }

        allSegments.push({ ...seg, videoFileName: video.fileName });
      }
    }

    // Build structured segments array — single source of truth for both
    // the JSON (preselection) and YAML-like text (prompt injection) formats.
    const structuredSegments: CorpusSegment[] = allSegments.map((seg, index) => {
      let meta: Record<string, string> = {};
      if (seg.metadata) {
        try {
          meta = JSON.parse(seg.metadata);
        } catch {
          // skip unparseable metadata
        }
      }
      return {
        index,
        videoFile: seg.videoFileName,
        startSeconds: seg.startSeconds,
        endSeconds: seg.endSeconds,
        description: seg.description,
        teaching_value: meta.teaching_value,
        skill_category: meta.skill_category,
        difficulty_level: meta.difficulty_level,
        feature_area: meta.feature_area,
        action_type: meta.action_type,
        tags: seg.tags,
      };
    });

    // Reuse shared serializer — single YAML-like format for all consumers
    const content = buildCorpusText(structuredSegments);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const corpusId = await ctx.db.insert('knowledgeCorpora', {
      version: nextVersion,
      name: `Corpus v${nextVersion} — ${dateStr}`,
      videoIds,
      tagFilter,
      segmentCount: allSegments.length,
      content,
      segments: JSON.stringify(structuredSegments),
      createdBy: actor,
      createdAt: Date.now(),
    });
    await auditLog(ctx, actor, 'corpus.merge', corpusId, {
      version: nextVersion,
      segmentCount: allSegments.length,
      videoCount: videoIds.length,
    });
    return corpusId;
  },
});

export const remove = mutation({
  args: { corpusId: v.id('knowledgeCorpora') },
  returns: v.null(),
  handler: async (ctx, { corpusId }) => {
    const { subject: actor } = await assertAdmin(ctx);
    const corpus = await ctx.db.get(corpusId);
    if (!corpus) throw new Error('Corpus not found');
    await ctx.db.delete(corpusId);
    await auditLog(ctx, actor, 'corpus.remove', corpusId, {
      version: corpus.version,
      name: corpus.name,
    });
    return null;
  },
});
