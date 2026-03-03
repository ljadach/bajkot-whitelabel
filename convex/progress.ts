import { query, mutation } from './_generated/server';
import { GenericMutationCtx } from 'convex/server';
import { v } from 'convex/values';
import { DataModel } from './_generated/dataModel';
import { getProfileByClerkUserId } from './lib/dbHelpers';

// ============================================
// Dashboard Stats
// ============================================

// Get overall learning statistics for the current user
export const getDashboardStats = query({
  args: {},
  returns: v.union(
    v.object({
      totalPoints: v.number(),
      exercisesCompleted: v.number(),
      chaptersCompleted: v.number(),
      totalChapters: v.number(),
      totalTimeMinutes: v.number(),
      streakDays: v.number(),
      longestStreak: v.number(),
      lastActivityAt: v.union(v.number(), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const clerkUserId = identity.subject;

    // Get user profile
    const profile = await getProfileByClerkUserId(ctx, clerkUserId);

    // Get user points
    const userPoints = await ctx.db
      .query('userPoints')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', clerkUserId))
      .first();

    // Get chapter progress
    const chapterProgress = await ctx.db
      .query('chapterProgress')
      .withIndex('by_user', (q) => q.eq('clerkUserId', clerkUserId))
      .collect();

    const chaptersCompleted = chapterProgress.filter((p) => p.status === 'completed').length;
    const totalTimeSeconds = chapterProgress.reduce((sum, p) => sum + p.timeSpentSeconds, 0);

    // Get total chapters from course documents
    const courseDocuments = profile?.courseDocumentIds ? await Promise.all(profile.courseDocumentIds.map((id) => ctx.db.get(id))) : [];
    const completedDocs = courseDocuments.filter((doc) => doc && doc.status === 'completed').length;
    const totalChapters = completedDocs * 3; // 3 chapters per document

    // Get learning stats from profile
    const learningStats = profile?.learningStats;

    return {
      totalPoints: userPoints?.totalPoints ?? 0,
      exercisesCompleted: userPoints?.exercisesCompleted ?? 0,
      chaptersCompleted,
      totalChapters,
      totalTimeMinutes: Math.round(totalTimeSeconds / 60),
      streakDays: learningStats?.streakDays ?? 0,
      longestStreak: learningStats?.longestStreak ?? 0,
      lastActivityAt: learningStats?.lastActivityAt ?? null,
    };
  },
});

// ============================================
// Module Progress
// ============================================

// Get progress for each module (course document)
export const getModuleProgress = query({
  args: {},
  returns: v.array(
    v.object({
      documentId: v.id('courseDocuments'),
      pageTitle: v.string(),
      pageIndex: v.number(),
      status: v.union(v.literal('not_started'), v.literal('in_progress'), v.literal('completed')),
      chapters: v.array(
        v.object({
          chapterNumber: v.number(),
          status: v.union(v.literal('not_started'), v.literal('in_progress'), v.literal('completed')),
          timeSpentMinutes: v.number(),
          exerciseCompleted: v.boolean(),
          exerciseScore: v.optional(v.number()),
        })
      ),
      totalTimeMinutes: v.number(),
      completionPercent: v.number(),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const clerkUserId = identity.subject;

    // Get user profile
    const profile = await getProfileByClerkUserId(ctx, clerkUserId);

    if (!profile?.courseDocumentIds) return [];

    const modules = [];

    for (const docId of profile.courseDocumentIds) {
      const doc = await ctx.db.get(docId);
      if (!doc) continue;

      // Get chapter progress for this document
      const chapterProgress = await ctx.db
        .query('chapterProgress')
        .withIndex('by_user_document', (q) => q.eq('clerkUserId', clerkUserId).eq('courseDocumentId', docId))
        .collect();

      // Get exercise submissions for this document
      const submissions = await ctx.db
        .query('exerciseSubmissions')
        .withIndex('by_document', (q) => q.eq('courseDocumentId', docId))
        .collect();
      const userSubmissions = submissions.filter((s) => s.clerkUserId === clerkUserId);

      // Build chapter data for chapters 1, 2, 3
      const chapters = [1, 2, 3].map((chapterNumber) => {
        const progress = chapterProgress.find((p) => p.chapterNumber === chapterNumber);
        const submission = userSubmissions.find((s) => s.chapterNumber === chapterNumber);

        return {
          chapterNumber,
          status: (progress?.status ?? 'not_started') as 'not_started' | 'in_progress' | 'completed',
          timeSpentMinutes: Math.round((progress?.timeSpentSeconds ?? 0) / 60),
          exerciseCompleted: submission !== undefined && submission.score > 0,
          exerciseScore: submission?.score,
        };
      });

      const totalTimeMinutes = chapters.reduce((sum, c) => sum + c.timeSpentMinutes, 0);
      const completedCount = chapters.filter((c) => c.status === 'completed').length;
      const completionPercent = Math.round((completedCount / 3) * 100);

      // Determine module status
      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      if (completedCount === 3) {
        status = 'completed';
      } else if (completedCount > 0 || chapters.some((c) => c.status === 'in_progress')) {
        status = 'in_progress';
      }

      modules.push({
        documentId: docId,
        pageTitle: doc.pageTitle,
        pageIndex: doc.pageIndex,
        status,
        chapters,
        totalTimeMinutes,
        completionPercent,
      });
    }

    return modules;
  },
});

// ============================================
// Activity Over Time
// ============================================

// Get activity log for progress visualization (last 30 days)
export const getActivityOverTime = query({
  args: {
    days: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      date: v.string(), // YYYY-MM-DD
      activities: v.number(),
      pointsEarned: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const clerkUserId = identity.subject;
    const days = args.days ?? 30;
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get recent activity
    const activities = await ctx.db
      .query('activityLog')
      .withIndex('by_user_time', (q) => q.eq('clerkUserId', clerkUserId).gte('timestamp', startTime))
      .collect();

    // Group by date
    const byDate: Record<string, { activities: number; pointsEarned: number }> = {};

    for (const activity of activities) {
      const date = new Date(activity.timestamp).toISOString().split('T')[0];
      if (!byDate[date]) {
        byDate[date] = { activities: 0, pointsEarned: 0 };
      }
      byDate[date].activities += 1;
      byDate[date].pointsEarned += activity.pointsEarned ?? 0;
    }

    // Build full range of days (including days with no activity)
    const result: { date: string; activities: number; pointsEarned: number }[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split('T')[0];
      result.push({
        date,
        activities: byDate[date]?.activities ?? 0,
        pointsEarned: byDate[date]?.pointsEarned ?? 0,
      });
    }

    return result;
  },
});

// Check if all 3 base chapters of a module are complete
export const isModuleComplete = query({
  args: { courseDocumentId: v.id('courseDocuments') },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const clerkUserId = identity.subject;

    for (const chapterNumber of [1, 2, 3]) {
      const progress = await ctx.db
        .query('chapterProgress')
        .withIndex('by_user_document_chapter', (q) => q.eq('clerkUserId', clerkUserId).eq('courseDocumentId', args.courseDocumentId).eq('chapterNumber', chapterNumber))
        .first();
      if (!progress || progress.status !== 'completed') return false;
    }

    return true;
  },
});

// Get progress for a specific chapter
export const getChapterStatus = query({
  args: {
    courseDocumentId: v.id('courseDocuments'),
    chapterNumber: v.number(),
  },
  returns: v.union(
    v.object({
      status: v.union(v.literal('not_started'), v.literal('in_progress'), v.literal('completed')),
      timeSpentSeconds: v.number(),
      startedAt: v.union(v.number(), v.null()),
      completedAt: v.union(v.number(), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const clerkUserId = identity.subject;

    const progress = await ctx.db
      .query('chapterProgress')
      .withIndex('by_user_document_chapter', (q) => q.eq('clerkUserId', clerkUserId).eq('courseDocumentId', args.courseDocumentId).eq('chapterNumber', args.chapterNumber))
      .first();

    if (!progress) {
      return {
        status: 'not_started' as const,
        timeSpentSeconds: 0,
        startedAt: null,
        completedAt: null,
      };
    }

    return {
      status: progress.status,
      timeSpentSeconds: progress.timeSpentSeconds,
      startedAt: progress.startedAt ?? null,
      completedAt: progress.completedAt ?? null,
    };
  },
});

// ============================================
// Chapter Progress Management
// ============================================

// Mark a chapter as started
export const startChapter = mutation({
  args: {
    courseDocumentId: v.id('courseDocuments'),
    chapterNumber: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const clerkUserId = identity.subject;

    // Check for existing progress
    const existing = await ctx.db
      .query('chapterProgress')
      .withIndex('by_user_document_chapter', (q) => q.eq('clerkUserId', clerkUserId).eq('courseDocumentId', args.courseDocumentId).eq('chapterNumber', args.chapterNumber))
      .first();

    if (existing) {
      // Already tracking this chapter
      return null;
    }

    // Create new progress record
    await ctx.db.insert('chapterProgress', {
      clerkUserId,
      courseDocumentId: args.courseDocumentId,
      chapterNumber: args.chapterNumber,
      status: 'in_progress',
      startedAt: Date.now(),
      timeSpentSeconds: 0,
    });

    // Log activity
    await ctx.db.insert('activityLog', {
      clerkUserId,
      activityType: 'chapter_started',
      referenceId: `${args.courseDocumentId}:${args.chapterNumber}`,
      timestamp: Date.now(),
    });

    return null;
  },
});

// Mark a chapter as completed
export const completeChapter = mutation({
  args: {
    courseDocumentId: v.id('courseDocuments'),
    chapterNumber: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const clerkUserId = identity.subject;

    // Get existing progress
    const existing = await ctx.db
      .query('chapterProgress')
      .withIndex('by_user_document_chapter', (q) => q.eq('clerkUserId', clerkUserId).eq('courseDocumentId', args.courseDocumentId).eq('chapterNumber', args.chapterNumber))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: 'completed',
        completedAt: Date.now(),
      });
    } else {
      // Create completed record
      await ctx.db.insert('chapterProgress', {
        clerkUserId,
        courseDocumentId: args.courseDocumentId,
        chapterNumber: args.chapterNumber,
        status: 'completed',
        startedAt: Date.now(),
        completedAt: Date.now(),
        timeSpentSeconds: 0,
      });
    }

    // Log activity
    await ctx.db.insert('activityLog', {
      clerkUserId,
      activityType: 'chapter_completed',
      referenceId: `${args.courseDocumentId}:${args.chapterNumber}`,
      timestamp: Date.now(),
    });

    // Update streak
    await updateStreak(ctx, clerkUserId);

    return null;
  },
});

// Record time spent on a chapter
export const recordTimeSpent = mutation({
  args: {
    courseDocumentId: v.id('courseDocuments'),
    chapterNumber: v.number(),
    secondsToAdd: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const clerkUserId = identity.subject;

    // Get existing progress
    const existing = await ctx.db
      .query('chapterProgress')
      .withIndex('by_user_document_chapter', (q) => q.eq('clerkUserId', clerkUserId).eq('courseDocumentId', args.courseDocumentId).eq('chapterNumber', args.chapterNumber))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        timeSpentSeconds: existing.timeSpentSeconds + args.secondsToAdd,
      });
    } else {
      // Create new record with time
      await ctx.db.insert('chapterProgress', {
        clerkUserId,
        courseDocumentId: args.courseDocumentId,
        chapterNumber: args.chapterNumber,
        status: 'in_progress',
        startedAt: Date.now(),
        timeSpentSeconds: args.secondsToAdd,
      });
    }

    // Update learning stats
    const profile = await getProfileByClerkUserId(ctx, clerkUserId);

    if (profile) {
      const currentStats = profile.learningStats ?? {
        totalTimeSpentMinutes: 0,
        lastActivityAt: Date.now(),
        streakDays: 0,
        longestStreak: 0,
      };

      await ctx.db.patch(profile._id, {
        learningStats: {
          ...currentStats,
          totalTimeSpentMinutes: currentStats.totalTimeSpentMinutes + Math.round(args.secondsToAdd / 60),
          lastActivityAt: Date.now(),
        },
      });
    }

    return null;
  },
});

// ============================================
// Day Activity Details (for chart popover)
// ============================================

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  probe: 'Chapter Probe',
  contrapositor: 'Contrapositor',
  conceptRadar: 'Concept Radar',
  skeletonKeyAuto: 'Skeleton Key',
  skeletonKeyManual: 'Skeleton Key',
  tomorrow: 'Tomorrow Zone',
  reflectionGate: 'Reflection Gate',
  glossator: 'Glossator',
};

export const getDayActivityDetails = query({
  args: { date: v.string() },
  returns: v.array(
    v.object({
      activityType: v.string(),
      pointsEarned: v.number(),
      label: v.string(),
      sublabel: v.optional(v.string()),
      pageIndex: v.optional(v.number()),
      chapterNumber: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const clerkUserId = identity.subject;

    // Compute day start/end timestamps from YYYY-MM-DD
    const dayStart = new Date(args.date + 'T00:00:00Z').getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    // Query activities for that day — only completed types
    const allActivities = await ctx.db
      .query('activityLog')
      .withIndex('by_user_time', (q) => q.eq('clerkUserId', clerkUserId).gte('timestamp', dayStart).lt('timestamp', dayEnd))
      .collect();

    const activities = allActivities.filter((a) => a.activityType === 'chapter_completed' || a.activityType === 'exercise_completed');

    if (activities.length === 0) return [];

    // Collect unique courseDocumentIds to batch-fetch
    const docIdSet = new Set<string>();
    for (const a of activities) {
      if (!a.referenceId) continue;
      if (a.activityType === 'chapter_completed') {
        const colonIdx = a.referenceId.lastIndexOf(':');
        if (colonIdx > 0) {
          docIdSet.add(a.referenceId.substring(0, colonIdx));
        }
      }
    }

    // Batch-fetch course documents
    const docCache = new Map<string, { pageTitle: string; pageIndex: number; handbook?: { chapter1: { title: string }; chapter2: { title: string }; chapter3: { title: string } } }>();
    for (const docId of docIdSet) {
      try {
        const doc = await ctx.db.get(docId as any);
        if (doc && 'pageTitle' in doc) {
          docCache.set(docId, doc as any);
        }
      } catch {
        // Invalid ID, skip
      }
    }

    // Resolve each activity
    const results: { activityType: string; pointsEarned: number; label: string; sublabel?: string; pageIndex?: number; chapterNumber?: number }[] = [];

    for (const a of activities) {
      let label = '';
      let sublabel: string | undefined;
      let pageIndex: number | undefined;
      let chapterNumber: number | undefined;

      if (a.activityType === 'chapter_completed' && a.referenceId) {
        // Format: docId:chapterNumber
        const colonIdx = a.referenceId.lastIndexOf(':');
        if (colonIdx > 0) {
          const docId = a.referenceId.substring(0, colonIdx);
          const chapterNum = parseInt(a.referenceId.substring(colonIdx + 1), 10);
          const doc = docCache.get(docId);
          if (doc) {
            label = doc.pageTitle;
            pageIndex = doc.pageIndex;
            chapterNumber = chapterNum;
            const chapterKey = `chapter${chapterNum}` as 'chapter1' | 'chapter2' | 'chapter3';
            if (doc.handbook && doc.handbook[chapterKey]) {
              sublabel = `Ch. ${chapterNum}: ${doc.handbook[chapterKey].title}`;
            }
          } else {
            label = 'Chapter';
          }
        } else {
          label = 'Chapter';
        }
      } else if (a.activityType === 'exercise_completed' && a.referenceId) {
        // Could be a submission ID or a tool ID
        const toolName = TOOL_DISPLAY_NAMES[a.referenceId];
        if (toolName) {
          label = toolName;
        } else {
          // Try as submission ID
          try {
            const submission = await ctx.db.get(a.referenceId as any);
            if (submission && 'exerciseId' in submission) {
              const sub = submission as any;
              const doc =
                docCache.get(sub.courseDocumentId) ??
                (await (async () => {
                  try {
                    const d = await ctx.db.get(sub.courseDocumentId);
                    if (d && 'pageTitle' in d) {
                      docCache.set(sub.courseDocumentId, d as any);
                      return d as any;
                    }
                  } catch {
                    /* skip */
                  }
                  return null;
                })());
              if (doc) {
                pageIndex = doc.pageIndex;
                // Get exercise type
                try {
                  const exercise = await ctx.db.get(sub.exerciseId);
                  if (exercise && 'exerciseType' in exercise) {
                    const chNum = (exercise as any).chapterNumber;
                    chapterNumber = chNum;
                    sublabel = `${doc.pageTitle}, Ch. ${chNum}`;
                    label = formatExerciseType((exercise as any).exerciseType);
                  }
                } catch {
                  label = doc.pageTitle;
                }
              } else {
                label = 'Exercise';
              }
            } else {
              label = 'Exercise';
            }
          } catch {
            label = 'Exercise';
          }
        }
      }

      if (label) {
        results.push({
          activityType: a.activityType,
          pointsEarned: a.pointsEarned ?? 0,
          label,
          sublabel,
          pageIndex,
          chapterNumber,
        });
      }
    }

    return results;
  },
});

function formatExerciseType(type: string): string {
  switch (type) {
    case 'prompt_improvement':
      return 'Prompt Improvement';
    case 'problem_solving':
      return 'Problem Solving';
    case 'reflection':
      return 'Reflection';
    default:
      return 'Exercise';
  }
}

// ============================================
// Helper Functions
// ============================================

async function updateStreak(ctx: GenericMutationCtx<DataModel>, clerkUserId: string) {
  const profile = await getProfileByClerkUserId(ctx, clerkUserId);

  if (!profile) return;

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const currentStats = profile.learningStats ?? {
    totalTimeSpentMinutes: 0,
    lastActivityAt: Date.now(),
    streakDays: 0,
    longestStreak: 0,
  };

  const lastActivity = currentStats.lastActivityAt ? new Date(currentStats.lastActivityAt).toISOString().split('T')[0] : null;

  let newStreak = currentStats.streakDays;

  if (lastActivity === today) {
    // Already active today, no change
  } else {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastActivity === yesterdayStr) {
      // Continuing streak
      newStreak = currentStats.streakDays + 1;
    } else {
      // Streak broken, starting new
      newStreak = 1;
    }
  }

  const longestStreak = Math.max(currentStats.longestStreak, newStreak);

  await ctx.db.patch(profile._id, {
    learningStats: {
      ...currentStats,
      lastActivityAt: Date.now(),
      streakDays: newStreak,
      longestStreak,
    },
  });
}
