import { internalQuery, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { getProfileByClerkUserId } from './lib/dbHelpers';
import { optionalLanguageCodeValidator } from './lib/languageValidator';

// Internal query to get profile data for course generation
export const getProfileForCourseGeneration = internalQuery({
  args: {
    clerkUserId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('userProfiles'),
      profileXml: v.optional(v.string()),
      planOutline: v.optional(v.string()),
      planFull: v.optional(v.string()),
      preferredLanguage: optionalLanguageCodeValidator,
      assessmentReport: v.optional(v.string()),
      skillVerification: v.optional(
        v.object({
          performanceScore: v.number(),
          selfAssessment: v.number(),
          promptText: v.optional(v.string()),
          level: v.optional(v.string()),
          feedback: v.optional(v.string()),
          completedAt: v.optional(v.number()),
          inputType: v.optional(v.string()),
        })
      ),
      inferredAiFluency: v.optional(
        v.object({
          score: v.number(),
          justification: v.string(),
          inferredAt: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const profile = await getProfileByClerkUserId(ctx, args.clerkUserId);

    if (!profile) return null;

    return {
      _id: profile._id,
      profileXml: profile.profileXml,
      planOutline: profile.planOutline,
      planFull: profile.planFull,
      preferredLanguage: profile.preferredLanguage,
      assessmentReport: profile.assessmentReport,
      skillVerification: profile.skillVerification,
      inferredAiFluency: profile.inferredAiFluency,
    };
  },
});

// Internal query to get a course document
export const getCourseDocumentInternal = internalQuery({
  args: {
    documentId: v.id('courseDocuments'),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('courseDocuments'),
      clerkUserId: v.string(),
      profileId: v.id('userProfiles'),
      pageIndex: v.number(),
      pageTitle: v.string(),
      status: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) return null;

    return {
      _id: document._id,
      clerkUserId: document.clerkUserId,
      profileId: document.profileId,
      pageIndex: document.pageIndex,
      pageTitle: document.pageTitle,
      status: document.status,
    };
  },
});

// Internal query to get a course document WITH handbook content
export const getCourseDocumentWithHandbook = internalQuery({
  args: {
    documentId: v.id('courseDocuments'),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('courseDocuments'),
      clerkUserId: v.string(),
      pageTitle: v.string(),
      status: v.string(),
      handbook: v.optional(
        v.object({
          chapter1: v.object({ title: v.string(), content: v.string() }),
          chapter2: v.object({ title: v.string(), content: v.string() }),
          chapter3: v.object({ title: v.string(), content: v.string() }),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) return null;

    const handbook = document.handbook
      ? {
          chapter1: { title: document.handbook.chapter1.title, content: document.handbook.chapter1.content },
          chapter2: { title: document.handbook.chapter2.title, content: document.handbook.chapter2.content },
          chapter3: { title: document.handbook.chapter3.title, content: document.handbook.chapter3.content },
        }
      : undefined;

    return {
      _id: document._id,
      clerkUserId: document.clerkUserId,
      pageTitle: document.pageTitle,
      status: document.status,
      handbook,
    };
  },
});

// Internal mutation to create course documents (bypasses auth for scheduler calls)
export const createCourseDocumentsInternal = internalMutation({
  args: {
    clerkUserId: v.string(),
    pages: v.array(
      v.object({
        index: v.number(),
        title: v.string(),
      })
    ),
  },
  returns: v.array(v.id('courseDocuments')),
  handler: async (ctx, args) => {
    const profile = await getProfileByClerkUserId(ctx, args.clerkUserId);

    if (!profile) throw new Error('Profile not found');

    // Delete existing documents for this profile
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
        clerkUserId: args.clerkUserId,
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
