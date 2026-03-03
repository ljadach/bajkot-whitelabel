import { query, mutation, internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

// ============================================
// Learning Instrument Artifacts — CRUD
// ============================================

// Save or update a learner artifact (upsert)
export const saveArtifact = mutation({
  args: {
    courseDocumentId: v.id('courseDocuments'),
    chapterNumber: v.number(),
    toolId: v.string(),
    content: v.string(),
  },
  returns: v.id('learnerArtifacts'),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const clerkUserId = identity.subject;

    // Check for existing artifact (upsert)
    const existing = await ctx.db
      .query('learnerArtifacts')
      .withIndex('by_user_document_tool', (q) => q.eq('clerkUserId', clerkUserId).eq('courseDocumentId', args.courseDocumentId).eq('toolId', args.toolId))
      .filter((q) => q.eq(q.field('chapterNumber'), args.chapterNumber))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        updatedAt: now,
        // Reset score/feedback when content changes
        score: undefined,
        feedback: undefined,
      });
      return existing._id;
    }

    return await ctx.db.insert('learnerArtifacts', {
      clerkUserId,
      courseDocumentId: args.courseDocumentId,
      chapterNumber: args.chapterNumber,
      toolId: args.toolId,
      content: args.content,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get all artifacts for a course document
export const getArtifacts = query({
  args: {
    courseDocumentId: v.id('courseDocuments'),
  },
  returns: v.array(
    v.object({
      _id: v.id('learnerArtifacts'),
      chapterNumber: v.number(),
      toolId: v.string(),
      content: v.string(),
      score: v.optional(v.number()),
      feedback: v.optional(v.string()),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const clerkUserId = identity.subject;

    const artifacts = await ctx.db
      .query('learnerArtifacts')
      .withIndex('by_user_document', (q) => q.eq('clerkUserId', clerkUserId).eq('courseDocumentId', args.courseDocumentId))
      .collect();

    return artifacts.map((a) => ({
      _id: a._id,
      chapterNumber: a.chapterNumber,
      toolId: a.toolId,
      content: a.content,
      score: a.score,
      feedback: a.feedback,
      updatedAt: a.updatedAt,
    }));
  },
});

// Get artifacts for a specific chapter
export const getArtifactsByChapter = query({
  args: {
    courseDocumentId: v.id('courseDocuments'),
    chapterNumber: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id('learnerArtifacts'),
      chapterNumber: v.number(),
      toolId: v.string(),
      content: v.string(),
      score: v.optional(v.number()),
      feedback: v.optional(v.string()),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const clerkUserId = identity.subject;

    const artifacts = await ctx.db
      .query('learnerArtifacts')
      .withIndex('by_user_document', (q) => q.eq('clerkUserId', clerkUserId).eq('courseDocumentId', args.courseDocumentId))
      .collect();

    return artifacts
      .filter((a) => a.chapterNumber === args.chapterNumber)
      .map((a) => ({
        _id: a._id,
        chapterNumber: a.chapterNumber,
        toolId: a.toolId,
        content: a.content,
        score: a.score,
        feedback: a.feedback,
        updatedAt: a.updatedAt,
      }));
  },
});

// Internal mutation for LLM actions to update score/feedback
export const updateScore = internalMutation({
  args: {
    artifactId: v.id('learnerArtifacts'),
    score: v.number(),
    feedback: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) throw new Error('Artifact not found');

    await ctx.db.patch(args.artifactId, {
      score: args.score,
      feedback: args.feedback,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Internal mutation for saving artifacts from internalActions (no auth context)
export const saveArtifactInternal = internalMutation({
  args: {
    clerkUserId: v.string(),
    courseDocumentId: v.id('courseDocuments'),
    chapterNumber: v.number(),
    toolId: v.string(),
    content: v.string(),
  },
  returns: v.id('learnerArtifacts'),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('learnerArtifacts')
      .withIndex('by_user_document_tool', (q) => q.eq('clerkUserId', args.clerkUserId).eq('courseDocumentId', args.courseDocumentId).eq('toolId', args.toolId))
      .filter((q) => q.eq(q.field('chapterNumber'), args.chapterNumber))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        updatedAt: now,
        score: undefined,
        feedback: undefined,
      });
      return existing._id;
    }

    return await ctx.db.insert('learnerArtifacts', {
      clerkUserId: args.clerkUserId,
      courseDocumentId: args.courseDocumentId,
      chapterNumber: args.chapterNumber,
      toolId: args.toolId,
      content: args.content,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get exploration chapters (chapterNumber >= 4) for a course document
export const getExplorationChapters = internalQuery({
  args: {
    courseDocumentId: v.id('courseDocuments'),
    clerkUserId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id('learnerArtifacts'),
      chapterNumber: v.number(),
      content: v.string(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const artifacts = await ctx.db
      .query('learnerArtifacts')
      .withIndex('by_user_document', (q) => q.eq('clerkUserId', args.clerkUserId).eq('courseDocumentId', args.courseDocumentId))
      .collect();

    return artifacts
      .filter((a) => a.toolId === 'exploration' && a.chapterNumber >= 4)
      .sort((a, b) => a.chapterNumber - b.chapterNumber)
      .map((a) => ({
        _id: a._id,
        chapterNumber: a.chapterNumber,
        content: a.content,
        updatedAt: a.updatedAt,
      }));
  },
});

// Get all artifacts for a course document (internal, no auth)
export const getAllArtifactsInternal = internalQuery({
  args: {
    courseDocumentId: v.id('courseDocuments'),
    clerkUserId: v.string(),
  },
  returns: v.array(
    v.object({
      chapterNumber: v.number(),
      toolId: v.string(),
      content: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const artifacts = await ctx.db
      .query('learnerArtifacts')
      .withIndex('by_user_document', (q) => q.eq('clerkUserId', args.clerkUserId).eq('courseDocumentId', args.courseDocumentId))
      .collect();

    return artifacts.map((a) => ({
      chapterNumber: a.chapterNumber,
      toolId: a.toolId,
      content: a.content,
    }));
  },
});
