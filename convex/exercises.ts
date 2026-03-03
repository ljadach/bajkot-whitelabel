import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// ============================================
// Exercise CRUD
// ============================================

// Get exercise for a specific chapter
export const getExerciseForChapter = query({
  args: {
    courseDocumentId: v.id('courseDocuments'),
    chapterNumber: v.number(),
  },
  returns: v.union(
    v.object({
      _id: v.id('exercises'),
      courseDocumentId: v.id('courseDocuments'),
      chapterNumber: v.number(),
      exerciseType: v.union(v.literal('prompt_improvement'), v.literal('problem_solving'), v.literal('reflection')),
      prompt: v.string(),
      hints: v.optional(v.array(v.string())),
      maxPoints: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Require authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const exercise = await ctx.db
      .query('exercises')
      .withIndex('by_document_chapter', (q) => q.eq('courseDocumentId', args.courseDocumentId).eq('chapterNumber', args.chapterNumber))
      .first();

    if (!exercise) return null;

    // Don't expose rubric to client
    return {
      _id: exercise._id,
      courseDocumentId: exercise.courseDocumentId,
      chapterNumber: exercise.chapterNumber,
      exerciseType: exercise.exerciseType,
      prompt: exercise.prompt,
      hints: exercise.hints,
      maxPoints: exercise.maxPoints,
    };
  },
});

// Get all exercises for a course document
export const getExercisesForDocument = query({
  args: {
    courseDocumentId: v.id('courseDocuments'),
  },
  returns: v.array(
    v.object({
      _id: v.id('exercises'),
      chapterNumber: v.number(),
      exerciseType: v.union(v.literal('prompt_improvement'), v.literal('problem_solving'), v.literal('reflection')),
      prompt: v.string(),
      maxPoints: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Require authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const exercises = await ctx.db
      .query('exercises')
      .withIndex('by_document', (q) => q.eq('courseDocumentId', args.courseDocumentId))
      .collect();

    return exercises.map((e) => ({
      _id: e._id,
      chapterNumber: e.chapterNumber,
      exerciseType: e.exerciseType,
      prompt: e.prompt,
      maxPoints: e.maxPoints,
    }));
  },
});

// ============================================
// User Submissions
// ============================================

// Get user's submission for an exercise
export const getUserSubmission = query({
  args: {
    exerciseId: v.id('exercises'),
  },
  returns: v.union(
    v.object({
      _id: v.id('exerciseSubmissions'),
      submissionText: v.string(),
      score: v.number(),
      feedback: v.string(),
      pointsAwarded: v.number(),
      submittedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const submission = await ctx.db
      .query('exerciseSubmissions')
      .withIndex('by_user_exercise', (q) => q.eq('clerkUserId', identity.subject).eq('exerciseId', args.exerciseId))
      .first();

    if (!submission) return null;

    return {
      _id: submission._id,
      submissionText: submission.submissionText,
      score: submission.score,
      feedback: submission.feedback,
      pointsAwarded: submission.pointsAwarded,
      submittedAt: submission.submittedAt,
    };
  },
});

// Get all user submissions for a course document
export const getUserSubmissionsForDocument = query({
  args: {
    courseDocumentId: v.id('courseDocuments'),
  },
  returns: v.array(
    v.object({
      exerciseId: v.id('exercises'),
      chapterNumber: v.number(),
      score: v.number(),
      pointsAwarded: v.number(),
      submittedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const submissions = await ctx.db
      .query('exerciseSubmissions')
      .withIndex('by_user', (q) => q.eq('clerkUserId', identity.subject))
      .collect();

    // Filter to this document
    const documentSubmissions = submissions.filter((s) => s.courseDocumentId === args.courseDocumentId);

    return documentSubmissions.map((s) => ({
      exerciseId: s.exerciseId,
      chapterNumber: s.chapterNumber,
      score: s.score,
      pointsAwarded: s.pointsAwarded,
      submittedAt: s.submittedAt,
    }));
  },
});

// Submit exercise answer (initial submission, before AI evaluation)
export const submitExercise = mutation({
  args: {
    exerciseId: v.id('exercises'),
    submissionText: v.string(),
  },
  returns: v.id('exerciseSubmissions'),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Get exercise details
    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) throw new Error('Exercise not found');

    // Check for existing submission
    const existing = await ctx.db
      .query('exerciseSubmissions')
      .withIndex('by_user_exercise', (q) => q.eq('clerkUserId', identity.subject).eq('exerciseId', args.exerciseId))
      .first();

    if (existing) {
      // Update existing submission (allow retry)
      await ctx.db.patch(existing._id, {
        submissionText: args.submissionText,
        submittedAt: Date.now(),
        // Reset evaluation fields for re-evaluation
        score: 0,
        feedback: 'Evaluating...',
        pointsAwarded: 0,
        evaluatedAt: undefined,
      });
      return existing._id;
    }

    // Create new submission
    return await ctx.db.insert('exerciseSubmissions', {
      clerkUserId: identity.subject,
      exerciseId: args.exerciseId,
      courseDocumentId: exercise.courseDocumentId,
      chapterNumber: exercise.chapterNumber,
      submissionText: args.submissionText,
      score: 0,
      feedback: 'Evaluating...',
      pointsAwarded: 0,
      submittedAt: Date.now(),
    });
  },
});

// ============================================
// User Points
// ============================================

// Get current user's points
export const getUserPoints = query({
  args: {},
  returns: v.union(
    v.object({
      totalPoints: v.number(),
      exercisesCompleted: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userPoints = await ctx.db
      .query('userPoints')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', identity.subject))
      .first();

    if (!userPoints) {
      return {
        totalPoints: 0,
        exercisesCompleted: 0,
      };
    }

    return {
      totalPoints: userPoints.totalPoints,
      exercisesCompleted: userPoints.exercisesCompleted,
    };
  },
});

// Get hint for an exercise (progressive reveal)
export const getHint = query({
  args: {
    exerciseId: v.id('exercises'),
    hintIndex: v.number(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    // Require authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise || !exercise.hints) return null;

    if (args.hintIndex < 0 || args.hintIndex >= exercise.hints.length) {
      return null;
    }

    return exercise.hints[args.hintIndex];
  },
});
