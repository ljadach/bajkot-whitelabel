import { query, mutation, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { getProfileByClerkUserId } from './lib/dbHelpers';

// Validator for handbook structure
const handbookChapterValidator = v.object({
  title: v.string(),
  content: v.string(),
  imagePlaceholder: v.optional(
    v.object({
      model: v.literal('google-nano-banana'),
      prompt: v.string(),
      mockUrl: v.string(),
    })
  ),
});

const handbookValidator = v.object({
  chapter1: handbookChapterValidator,
  chapter2: handbookChapterValidator,
  chapter3: handbookChapterValidator,
});

export const getCourseDocuments = query({
  args: {},
  returns: v.union(
    v.null(),
    v.array(
      v.object({
        _id: v.id('courseDocuments'),
        _creationTime: v.number(),
        clerkUserId: v.string(),
        profileId: v.id('userProfiles'),
        pageIndex: v.number(),
        pageTitle: v.string(),
        status: v.union(v.literal('pending'), v.literal('generating'), v.literal('completed'), v.literal('failed')),
        handbook: v.optional(handbookValidator),
        error: v.optional(v.string()),
        generatedAt: v.optional(v.number()),
        createdAt: v.number(),
        courseId: v.optional(v.id('courses')),
        webSearchSources: v.optional(v.array(v.string())),
      })
    )
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const profile = await getProfileByClerkUserId(ctx, identity.subject);

    if (!profile) return null;

    const documents = await ctx.db
      .query('courseDocuments')
      .withIndex('by_profile', (q) => q.eq('profileId', profile._id))
      .collect();

    // Sort by pageIndex
    return documents.sort((a, b) => a.pageIndex - b.pageIndex);
  },
});

export const getCourseDocument = query({
  args: {
    documentId: v.id('courseDocuments'),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('courseDocuments'),
      _creationTime: v.number(),
      clerkUserId: v.string(),
      profileId: v.id('userProfiles'),
      pageIndex: v.number(),
      pageTitle: v.string(),
      status: v.union(v.literal('pending'), v.literal('generating'), v.literal('completed'), v.literal('failed')),
      handbook: v.optional(handbookValidator),
      error: v.optional(v.string()),
      generatedAt: v.optional(v.number()),
      createdAt: v.number(),
      courseId: v.optional(v.id('courses')),
      webSearchSources: v.optional(v.array(v.string())),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const document = await ctx.db.get(args.documentId);
    if (!document) return null;

    // Verify ownership
    if (document.clerkUserId !== identity.subject) return null;

    return document;
  },
});

export const createCourseDocuments = mutation({
  args: {
    pages: v.array(
      v.object({
        index: v.number(),
        title: v.string(),
      })
    ),
  },
  returns: v.array(v.id('courseDocuments')),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const clerkUserId = identity.subject;

    const profile = await getProfileByClerkUserId(ctx, clerkUserId);

    if (!profile) throw new Error('Profile not found');

    // Delete existing documents for this profile (fresh generation)
    const existingDocs = await ctx.db
      .query('courseDocuments')
      .withIndex('by_profile', (q) => q.eq('profileId', profile._id))
      .collect();

    for (const doc of existingDocs) {
      await ctx.db.delete(doc._id);
    }

    // Create new pending documents
    const documentIds: Id<'courseDocuments'>[] = [];
    const now = Date.now();

    for (const page of args.pages) {
      const docId = await ctx.db.insert('courseDocuments', {
        clerkUserId,
        profileId: profile._id,
        pageIndex: page.index,
        pageTitle: page.title,
        status: 'pending',
        createdAt: now,
      });
      documentIds.push(docId);
    }

    // Update profile with document IDs
    await ctx.db.patch(profile._id, {
      courseDocumentIds: documentIds,
    });

    return documentIds;
  },
});

export const updateDocumentStatus = internalMutation({
  args: {
    documentId: v.id('courseDocuments'),
    status: v.union(v.literal('pending'), v.literal('generating'), v.literal('completed'), v.literal('failed')),
    handbook: v.optional(handbookValidator),
    error: v.optional(v.string()),
    webSearchSources: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) return null;

    await ctx.db.patch(args.documentId, {
      status: args.status,
      ...(args.handbook && { handbook: args.handbook }),
      ...(args.error && { error: args.error }),
      ...(args.webSearchSources && { webSearchSources: args.webSearchSources }),
      ...(args.status === 'completed' && { generatedAt: Date.now() }),
    });

    return null;
  },
});

// Public mutation for manual regeneration
export const regenerateDocument = mutation({
  args: {
    documentId: v.id('courseDocuments'),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error('Document not found');

    // Verify ownership
    if (document.clerkUserId !== identity.subject) {
      throw new Error('Not authorized');
    }

    // Reset to pending for regeneration
    await ctx.db.patch(args.documentId, {
      status: 'pending',
      handbook: undefined,
      error: undefined,
    });

    return true;
  },
});
