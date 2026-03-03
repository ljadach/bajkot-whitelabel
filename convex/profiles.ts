import { query, mutation } from './_generated/server';
import { GenericMutationCtx } from 'convex/server';
import { v } from 'convex/values';
import { DataModel, Doc, Id } from './_generated/dataModel';
import { defaultProfileXml, deriveProfileStateFromXml } from './lib/profileXml';
import { chatMessageValidator } from './lib/chatMessage';
import { getAuthenticatedProfile, getProfileByClerkUserId } from './lib/dbHelpers';
import { optionalLanguageCodeValidator } from './lib/languageValidator';

type MutationCtx = GenericMutationCtx<DataModel>;

/**
 * Delete all course documents and exercises for a profile.
 */
async function deleteCourseDocumentsAndExercises(ctx: MutationCtx, profileId: Id<'userProfiles'>) {
  const courseDocuments = await ctx.db
    .query('courseDocuments')
    .withIndex('by_profile', (q) => q.eq('profileId', profileId))
    .collect();

  for (const doc of courseDocuments) {
    const exercises = await ctx.db
      .query('exercises')
      .withIndex('by_document', (q) => q.eq('courseDocumentId', doc._id))
      .collect();
    for (const exercise of exercises) {
      await ctx.db.delete(exercise._id);
    }
    await ctx.db.delete(doc._id);
  }
}

/**
 * Delete/reset user progress data (submissions, points, chapter progress).
 * @param mode - 'reset' resets points to 0, 'delete' removes everything
 */
async function deleteUserProgressData(ctx: MutationCtx, clerkUserId: string, mode: 'reset' | 'delete') {
  // Delete exercise submissions
  const submissions = await ctx.db
    .query('exerciseSubmissions')
    .withIndex('by_user', (q) => q.eq('clerkUserId', clerkUserId))
    .collect();
  for (const submission of submissions) {
    await ctx.db.delete(submission._id);
  }

  // Handle user points
  const userPoints = await ctx.db
    .query('userPoints')
    .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', clerkUserId))
    .first();
  if (userPoints) {
    if (mode === 'delete') {
      await ctx.db.delete(userPoints._id);
    } else {
      await ctx.db.patch(userPoints._id, {
        totalPoints: 0,
        exercisesCompleted: 0,
        lastUpdatedAt: Date.now(),
      });
    }
  }

  // Delete chapter progress
  const chapterProgress = await ctx.db
    .query('chapterProgress')
    .withIndex('by_user', (q) => q.eq('clerkUserId', clerkUserId))
    .collect();
  for (const progress of chapterProgress) {
    await ctx.db.delete(progress._id);
  }
}

export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    return getAuthenticatedProfile(ctx);
  },
});

export const createOrUpdateProfile = mutation({
  args: {
    step: v.optional(v.string()),
    chatHistory: v.optional(v.array(chatMessageValidator)),
    assessmentReport: v.optional(v.string()),
    profileXml: v.optional(v.string()),
    planOutline: v.optional(v.string()),
    planFull: v.optional(v.string()),
    planMetadata: v.optional(v.string()),
    planSearchSources: v.optional(v.array(v.string())),
    intakeComplete: v.optional(v.boolean()),
    preferredLanguage: optionalLanguageCodeValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error('Not authenticated');
    }

    const clerkUserId = identity.subject;

    // Trim chatHistory to prevent unbounded growth (max 200 messages)
    const MAX_HISTORY_LENGTH = 200;
    const trimmedHistory = args.chatHistory ? args.chatHistory.slice(-MAX_HISTORY_LENGTH) : undefined;

    const existingProfile = await getProfileByClerkUserId(ctx, clerkUserId);

    const existingXml = existingProfile?.profileXml ?? '';
    const baseProfileXml = existingXml || defaultProfileXml();
    const nextProfileXml = typeof args.profileXml === 'string' && args.profileXml.trim() ? args.profileXml : baseProfileXml;
    const nextProfileState = deriveProfileStateFromXml(nextProfileXml) ?? '{}';

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        ...(typeof args.step === 'string' && { currentStep: args.step }),
        ...(trimmedHistory && { chatHistory: trimmedHistory }),
        // Always keep profile XML present; if LLM/client updates it, store the new version.
        profileXml: nextProfileXml,
        profileState: nextProfileState,
        ...(typeof args.assessmentReport === 'string' && {
          assessmentReport: args.assessmentReport,
        }),
        ...(typeof args.planOutline === 'string' && {
          planOutline: args.planOutline,
        }),
        ...(typeof args.planFull === 'string' && { planFull: args.planFull }),
        ...(typeof args.planMetadata === 'string' && {
          planMetadata: args.planMetadata,
        }),
        ...(args.planSearchSources && { planSearchSources: args.planSearchSources }),
        ...(typeof args.intakeComplete === 'boolean' && {
          intakeComplete: args.intakeComplete,
        }),
        ...(typeof args.preferredLanguage === 'string' && {
          preferredLanguage: args.preferredLanguage,
        }),
      });
      return existingProfile._id;
    } else {
      return await ctx.db.insert('userProfiles', {
        clerkUserId,
        currentStep: args.step || 'welcome',
        chatHistory: trimmedHistory || [],
        profileXml: nextProfileXml,
        profileState: nextProfileState,
        ...(typeof args.assessmentReport === 'string' && {
          assessmentReport: args.assessmentReport,
        }),
        ...(typeof args.planOutline === 'string' && {
          planOutline: args.planOutline,
        }),
        ...(typeof args.planFull === 'string' && { planFull: args.planFull }),
        ...(typeof args.planMetadata === 'string' && {
          planMetadata: args.planMetadata,
        }),
        ...(args.planSearchSources && { planSearchSources: args.planSearchSources }),
        ...(typeof args.intakeComplete === 'boolean' && {
          intakeComplete: args.intakeComplete,
        }),
        ...(typeof args.preferredLanguage === 'string' && {
          preferredLanguage: args.preferredLanguage,
        }),
      });
    }
  },
});

// Reset profile to initial state - clears all user data except activityLog
export const resetProfile = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const clerkUserId = identity.subject;
    const profile = await getProfileByClerkUserId(ctx, clerkUserId);

    if (profile) {
      // Delete course documents and exercises
      await deleteCourseDocumentsAndExercises(ctx, profile._id);

      // Delete courses owned by this user
      const userCourses = await ctx.db
        .query('courses')
        .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', clerkUserId))
        .collect();
      for (const course of userCourses) {
        await ctx.db.delete(course._id);
      }

      // Reset the profile to initial state
      await ctx.db.patch(profile._id, {
        currentStep: 'welcome',
        chatHistory: [],
        profileXml: defaultProfileXml(),
        profileState: '{}',
        intakeComplete: undefined,
        assessmentReport: undefined,
        planOutline: undefined,
        planFull: undefined,
        planMetadata: undefined,
        skillVerification: undefined,
        inferredAiFluency: undefined,
        trainingOutline: undefined,
        quickTip: undefined,
        courseDocumentIds: undefined,
        learningStats: undefined,
        toolPreferences: undefined,
        // Keep: paymentStatus, stripeSessionId, completedAt, email, organizationId
      });
    }

    // Delete/reset progress data (keeps points record but zeros it)
    await deleteUserProgressData(ctx, clerkUserId, 'reset');

    // Note: activityLog is intentionally NOT deleted to preserve user history
    return null;
  },
});

export const updateSkillVerification = mutation({
  args: {
    performanceScore: v.number(),
    selfAssessment: v.number(),
    promptText: v.optional(v.string()), // PRD: Best prompt submitted
    level: v.optional(v.string()), // PRD: Calculated level
    feedback: v.optional(v.string()), // PRD: Mini-feedback
    inputType: v.optional(v.string()), // 'prompt' | 'skill'
    inferredAiFluency: v.optional(
      v.object({
        score: v.number(),
        justification: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const profile = await getProfileByClerkUserId(ctx, identity.subject);

    if (!profile) throw new Error('Profile not found');

    await ctx.db.patch(profile._id, {
      skillVerification: {
        performanceScore: args.performanceScore,
        selfAssessment: args.selfAssessment,
        promptText: args.promptText,
        level: args.level,
        feedback: args.feedback,
        completedAt: Date.now(),
        inputType: args.inputType,
      },
      ...(args.inferredAiFluency && {
        inferredAiFluency: {
          score: args.inferredAiFluency.score,
          justification: args.inferredAiFluency.justification,
          inferredAt: Date.now(),
        },
      }),
      currentStep: 'summary',
    });
  },
});

// GDPR: Delete all user data permanently
export const deleteAccount = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const clerkUserId = identity.subject;
    const profile = await getProfileByClerkUserId(ctx, clerkUserId);

    if (profile) {
      // Delete course documents and exercises
      await deleteCourseDocumentsAndExercises(ctx, profile._id);
      // Delete the profile itself
      await ctx.db.delete(profile._id);
    }

    // Delete courses owned by this user
    const userCourses = await ctx.db
      .query('courses')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', clerkUserId))
      .collect();
    for (const course of userCourses) {
      await ctx.db.delete(course._id);
    }

    // Delete progress data (submissions, points, chapter progress)
    await deleteUserProgressData(ctx, clerkUserId, 'delete');

    // Delete activity log
    const activityLogs = await ctx.db
      .query('activityLog')
      .withIndex('by_user', (q) => q.eq('clerkUserId', clerkUserId))
      .collect();
    for (const log of activityLogs) {
      await ctx.db.delete(log._id);
    }

    // 8. Delete rate limit records
    const rateLimits = await ctx.db
      .query('rateLimits')
      .withIndex('by_clerk_user_action', (q) => q.eq('clerkUserId', clerkUserId))
      .collect();
    for (const record of rateLimits) {
      await ctx.db.delete(record._id);
    }

    // 9. Delete LLM logs
    const llmLogs = await ctx.db
      .query('llmLogs')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', clerkUserId))
      .collect();
    for (const log of llmLogs) {
      await ctx.db.delete(log._id);
    }

    // 10. Delete session tokens
    const sessionTokens = await ctx.db
      .query('sessionTokens')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', clerkUserId))
      .collect();
    for (const token of sessionTokens) {
      await ctx.db.delete(token._id);
    }

    // 11. Handle organization membership
    const memberships = await ctx.db
      .query('organizationMembers')
      .withIndex('by_user', (q) => q.eq('clerkUserId', clerkUserId))
      .collect();
    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    // 12. Handle owned organizations (delete if owner, or transfer would be needed)
    const ownedOrgs = await ctx.db
      .query('organizations')
      .withIndex('by_owner', (q) => q.eq('ownerId', clerkUserId))
      .collect();
    for (const org of ownedOrgs) {
      // Delete all members of this org
      const orgMembers = await ctx.db
        .query('organizationMembers')
        .withIndex('by_org', (q) => q.eq('organizationId', org._id))
        .collect();
      for (const member of orgMembers) {
        await ctx.db.delete(member._id);
      }
      // Delete all invites for this org
      const orgInvites = await ctx.db
        .query('organizationInvites')
        .withIndex('by_org', (q) => q.eq('organizationId', org._id))
        .collect();
      for (const invite of orgInvites) {
        await ctx.db.delete(invite._id);
      }
      // Delete the organization
      await ctx.db.delete(org._id);
    }

    return null;
  },
});

export const updatePaymentStatus = mutation({
  args: {
    status: v.string(),
    stripeSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const profile = await getProfileByClerkUserId(ctx, identity.subject);

    if (!profile) throw new Error('Profile not found');

    await ctx.db.patch(profile._id, {
      paymentStatus: args.status,
      ...(args.stripeSessionId && { stripeSessionId: args.stripeSessionId }),
      ...(args.status === 'completed' && {
        completedAt: Date.now(),
        currentStep: 'complete',
      }),
    });
  },
});

export const updateToolPreferences = mutation({
  args: {
    toolPreferences: v.object({
      glossatorMargin: v.boolean(),
      workbenchTabs: v.boolean(),
      feynmanOracle: v.boolean(),
      chapterProbes: v.boolean(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const profile = await getProfileByClerkUserId(ctx, identity.subject);
    if (!profile) throw new Error('Profile not found');
    await ctx.db.patch(profile._id, { toolPreferences: args.toolPreferences });
    return null;
  },
});

// Clear quick tip so it can be regenerated
export const clearQuickTip = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const profile = await getProfileByClerkUserId(ctx, identity.subject);

    if (!profile) throw new Error('Profile not found');

    await ctx.db.patch(profile._id, {
      quickTip: undefined,
    });

    return null;
  },
});

// Clear generated materials (tip, diary, outline, handbooks, exercises) so they can be regenerated
export const clearGeneratedMaterials = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const profile = await getProfileByClerkUserId(ctx, identity.subject);
    if (!profile) throw new Error('Profile not found');

    // Delete course documents + exercises
    await deleteCourseDocumentsAndExercises(ctx, profile._id);

    // Delete progress data (submissions, points, chapter progress)
    await deleteUserProgressData(ctx, identity.subject, 'reset');

    // Clear generated fields on the profile
    await ctx.db.patch(profile._id, {
      quickTip: undefined,
      diaryEntry: undefined,
      planOutline: undefined,
      planFull: undefined,
      planMetadata: undefined,
      courseDocumentIds: undefined,
    });

    return null;
  },
});
