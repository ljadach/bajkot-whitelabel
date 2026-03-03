import { action, internalAction, internalQuery, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { chatJsonForStage } from './lib/llmClient';
import { renderPrompt, PromptTemplate, EXERCISE_TYPE_GUIDELINES } from './lib/prompts';
import { startActiveObservation } from './lib/langfuse';
import { prepareAuthenticatedLlmAction, buildInternalLogContext } from './lib/actionHelpers';
import { getLanguageFromProfile, DEFAULT_LANGUAGE_NAME } from './lib/language';
import { EDITORIAL_GUIDE_SECTION } from './lib/editorialGuide';
import { buildProfileSummary } from './lib/profileXml';
import { getProfileByClerkUserId } from './lib/dbHelpers';

// ============================================
// Internal Queries (must be defined first for type generation)
// ============================================

// Internal query to get submission details (with exercise info)
export const getSubmissionDetails = internalQuery({
  args: {
    submissionId: v.id('exerciseSubmissions'),
  },
  returns: v.union(
    v.object({
      clerkUserId: v.string(),
      submissionText: v.string(),
      exercisePrompt: v.string(),
      exerciseType: v.union(v.literal('prompt_improvement'), v.literal('problem_solving'), v.literal('reflection')),
      maxPoints: v.number(),
      rubric: v.union(v.string(), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) return null;

    const exercise = await ctx.db.get(submission.exerciseId);
    if (!exercise) return null;

    return {
      clerkUserId: submission.clerkUserId,
      submissionText: submission.submissionText,
      exercisePrompt: exercise.prompt,
      exerciseType: exercise.exerciseType,
      maxPoints: exercise.maxPoints,
      rubric: exercise.rubric ?? null,
    };
  },
});

// Internal mutation to create or update exercise
export const createExercise = internalMutation({
  args: {
    courseDocumentId: v.id('courseDocuments'),
    chapterNumber: v.number(),
    exerciseType: v.union(v.literal('prompt_improvement'), v.literal('problem_solving'), v.literal('reflection')),
    prompt: v.string(),
    hints: v.optional(v.array(v.string())),
    maxPoints: v.number(),
    rubric: v.optional(v.string()),
  },
  returns: v.id('exercises'),
  handler: async (ctx, args) => {
    // Check if exercise already exists for this chapter
    const existing = await ctx.db
      .query('exercises')
      .withIndex('by_document_chapter', (q) => q.eq('courseDocumentId', args.courseDocumentId).eq('chapterNumber', args.chapterNumber))
      .first();

    if (existing) {
      // Update existing exercise
      await ctx.db.patch(existing._id, {
        exerciseType: args.exerciseType,
        prompt: args.prompt,
        hints: args.hints,
        maxPoints: args.maxPoints,
        rubric: args.rubric,
      });
      return existing._id;
    }

    // Create new exercise
    return await ctx.db.insert('exercises', {
      courseDocumentId: args.courseDocumentId,
      chapterNumber: args.chapterNumber,
      exerciseType: args.exerciseType,
      prompt: args.prompt,
      hints: args.hints,
      maxPoints: args.maxPoints,
      rubric: args.rubric,
      createdAt: Date.now(),
    });
  },
});

// Internal mutation to update submission with evaluation
export const updateSubmissionWithEvaluation = internalMutation({
  args: {
    submissionId: v.id('exerciseSubmissions'),
    score: v.number(),
    feedback: v.string(),
    pointsAwarded: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error('Submission not found');

    // Update submission with evaluation
    await ctx.db.patch(args.submissionId, {
      score: args.score,
      feedback: args.feedback,
      pointsAwarded: args.pointsAwarded,
      evaluatedAt: Date.now(),
    });

    // Update user's total points
    const userPoints = await ctx.db
      .query('userPoints')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', submission.clerkUserId))
      .first();

    if (userPoints) {
      await ctx.db.patch(userPoints._id, {
        totalPoints: userPoints.totalPoints + args.pointsAwarded,
        exercisesCompleted: userPoints.exercisesCompleted + 1,
        lastUpdatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('userPoints', {
        clerkUserId: submission.clerkUserId,
        totalPoints: args.pointsAwarded,
        exercisesCompleted: 1,
        lastUpdatedAt: Date.now(),
      });
    }

    // Log activity
    await ctx.db.insert('activityLog', {
      clerkUserId: submission.clerkUserId,
      activityType: 'exercise_completed',
      referenceId: args.submissionId,
      pointsEarned: args.pointsAwarded,
      timestamp: Date.now(),
    });

    return null;
  },
});

// Internal query to get learner context for evaluation
export const getEvaluationContext = internalQuery({
  args: { clerkUserId: v.string() },
  returns: v.union(
    v.object({
      profileXml: v.string(),
      language: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const profile = await getProfileByClerkUserId(ctx, args.clerkUserId);
    if (!profile) return null;
    return {
      profileXml: profile.profileXml || '',
      language: getLanguageFromProfile(profile),
    };
  },
});

// ============================================
// Exercise AI Evaluation
// ============================================

// Evaluate user's exercise submission with AI
export const evaluateExercise = action({
  args: {
    submissionId: v.id('exerciseSubmissions'),
  },
  returns: v.object({
    score: v.number(),
    feedback: v.string(),
    pointsAwarded: v.number(),
  }),
  handler: async (ctx, args) => {
    const { clerkUserId, logContext } = await prepareAuthenticatedLlmAction(ctx);

    // Get submission details
    const submission = await ctx.runQuery(internal.exerciseAi.getSubmissionDetails, {
      submissionId: args.submissionId,
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    if (submission.clerkUserId !== clerkUserId) {
      throw new Error('Not authorized');
    }

    // Load learner context for personalized evaluation
    const evalContext = await ctx.runQuery(internal.exerciseAi.getEvaluationContext, { clerkUserId });
    const language = evalContext?.language || DEFAULT_LANGUAGE_NAME;
    const profileSummary = evalContext?.profileXml ? buildProfileSummary(evalContext.profileXml) : '';

    const result = await startActiveObservation(
      'action.evaluateExercise',
      async (span) => {
        span.update({
          action: 'evaluateExercise',
          exerciseType: submission.exerciseType,
          submissionLength: submission.submissionText.length,
        });

        const systemPrompt = await renderPrompt(PromptTemplate.ExerciseEvaluationSystem, {
          TYPE_GUIDELINES: EXERCISE_TYPE_GUIDELINES[submission.exerciseType] || '',
          RUBRIC: submission.rubric ? `Additional rubric:\n${submission.rubric}` : '',
          LANGUAGE: language,
        });
        const userPrompt = await renderPrompt(PromptTemplate.ExerciseEvaluationUser, {
          MAX_POINTS: String(submission.maxPoints),
          EXERCISE_PROMPT: submission.exercisePrompt,
          SUBMISSION_TEXT: submission.submissionText,
          LEARNER_CONTEXT: profileSummary ? `Learner context: ${profileSummary}` : '',
        });

        const evalResult = await chatJsonForStage<{
          score: number;
          feedback: string;
          strengths: string[];
          improvements: string[];
        }>(
          'exerciseEvaluation',
          { system: systemPrompt, user: userPrompt },
          {
            score: 50,
            feedback: 'Good attempt. Keep practicing to improve your AI skills.',
            strengths: ['Completed the exercise'],
            improvements: ['Add more detail'],
          },
          logContext
        );

        // Normalize score to 0-100
        const normalizedScore = Math.max(0, Math.min(100, Number(evalResult.score) || 50));

        // Calculate points (percentage of max points)
        const pointsAwarded = Math.round((normalizedScore / 100) * submission.maxPoints);

        // Build feedback with strengths and improvements
        const formattedFeedback = formatFeedback(evalResult.feedback, evalResult.strengths || [], evalResult.improvements || []);

        span.update({ score: normalizedScore, points: pointsAwarded });

        return {
          score: normalizedScore,
          feedback: formattedFeedback,
          pointsAwarded,
        };
      },
      { asType: 'span' }
    );

    // Update submission with evaluation results
    await ctx.runMutation(internal.exerciseAi.updateSubmissionWithEvaluation, {
      submissionId: args.submissionId,
      score: result.score,
      feedback: result.feedback,
      pointsAwarded: result.pointsAwarded,
    });

    return result;
  },
});

// ============================================
// Exercise Generation
// ============================================

// Internal query to get chapter content from document
export const getChapterContent = internalQuery({
  args: {
    documentId: v.id('courseDocuments'),
    chapterNumber: v.number(),
  },
  returns: v.union(
    v.object({
      clerkUserId: v.string(),
      title: v.string(),
      content: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc || !doc.handbook) return null;

    const chapterKey = `chapter${args.chapterNumber}` as 'chapter1' | 'chapter2' | 'chapter3';
    const chapter = doc.handbook[chapterKey];
    if (!chapter) return null;

    return {
      clerkUserId: doc.clerkUserId,
      title: chapter.title,
      content: chapter.content,
    };
  },
});

// Public action to manually generate an exercise for a chapter
export const generateExerciseManually = action({
  args: {
    courseDocumentId: v.id('courseDocuments'),
    chapterNumber: v.number(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }
    const clerkUserId = identity.subject;

    // Rate limiting
    await ctx.runMutation(internal.rateLimitMutation.checkAndRecordLLMRateLimit, {
      actionType: 'llm_call',
      clerkUserId,
    });

    // Get chapter content
    const chapter = await ctx.runQuery(internal.exerciseAi.getChapterContent, {
      documentId: args.courseDocumentId,
      chapterNumber: args.chapterNumber,
    });

    if (!chapter) {
      throw new Error('Chapter not found');
    }

    if (chapter.clerkUserId !== clerkUserId) {
      throw new Error('Not authorized');
    }

    // Get user profile for context and language
    const profile = await ctx.runQuery(internal.courseAiHelpers.getProfileForCourseGeneration, {
      clerkUserId,
    });

    const language = getLanguageFromProfile(profile);

    // Schedule exercise generation
    await ctx.scheduler.runAfter(0, internal.exerciseAi.generateExerciseForChapter, {
      courseDocumentId: args.courseDocumentId,
      chapterNumber: args.chapterNumber,
      chapterTitle: chapter.title,
      chapterContent: chapter.content,
      userContext: profile?.profileXml,
      language,
      clerkUserId,
    });

    return { success: true };
  },
});

// Generate exercise for a chapter based on content
export const generateExerciseForChapter = internalAction({
  args: {
    courseDocumentId: v.id('courseDocuments'),
    chapterNumber: v.number(),
    chapterTitle: v.string(),
    chapterContent: v.string(),
    userContext: v.optional(v.string()), // Profile XML or summary
    language: v.optional(v.string()), // Language for exercise generation
    clerkUserId: v.optional(v.string()), // For LLM log context
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const logContext = args.clerkUserId ? buildInternalLogContext(ctx, args.clerkUserId) : undefined;
    const language = args.language || DEFAULT_LANGUAGE_NAME;

    const result = await startActiveObservation(
      'action.generateExercise',
      async (span) => {
        span.update({
          action: 'generateExercise',
          chapterNumber: args.chapterNumber,
          language,
        });

        const systemPrompt = await renderPrompt(PromptTemplate.ExerciseGenerationSystem, {
          LANGUAGE: language,
          EDITORIAL_GUIDE: EDITORIAL_GUIDE_SECTION,
        });
        const userPrompt = await renderPrompt(PromptTemplate.ExerciseGenerationUser, {
          CHAPTER_TITLE: args.chapterTitle,
          CHAPTER_NUMBER: String(args.chapterNumber),
          CHAPTER_CONTENT: args.chapterContent.slice(0, 4000),
          USER_CONTEXT: args.userContext ? `Learner Profile:\n${args.userContext}` : '',
        });

        const exercise = await chatJsonForStage<{
          exerciseType: 'prompt_improvement' | 'problem_solving' | 'reflection';
          prompt: string;
          hints: string[];
          maxPoints: number;
          rubric: string;
        }>(
          'exerciseGeneration',
          { system: systemPrompt, user: userPrompt },
          {
            exerciseType: 'reflection',
            prompt: 'Reflect on what you learned in this chapter and describe how you would apply it in your work.',
            hints: ['Think about a specific task you do regularly', 'Consider how AI could help'],
            maxPoints: 100,
            rubric: 'Evaluate based on specificity and practical applicability.',
          },
          logContext
        );

        span.update({ exerciseType: exercise.exerciseType });
        return exercise;
      },
      { asType: 'span' }
    );

    // Save exercise to database
    await ctx.runMutation(internal.exerciseAi.createExercise, {
      courseDocumentId: args.courseDocumentId,
      chapterNumber: args.chapterNumber,
      exerciseType: result.exerciseType,
      prompt: result.prompt,
      hints: result.hints,
      maxPoints: result.maxPoints || 100,
      rubric: result.rubric,
    });

    return null;
  },
});

// ============================================
// Helper Functions
// ============================================

function formatFeedback(summary: string, strengths: string[], improvements: string[]): string {
  let feedback = summary || 'Good effort!';

  if (strengths.length > 0) {
    feedback += '\n\n**Strengths:**\n' + strengths.map((s) => `- ${s}`).join('\n');
  }

  if (improvements.length > 0) {
    feedback += '\n\n**To improve:**\n' + improvements.map((i) => `- ${i}`).join('\n');
  }

  return feedback;
}
