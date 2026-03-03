import { query } from './_generated/server';
import { v } from 'convex/values';
import { getProfileByClerkUserId, getOrgManagerOrAdminMembership } from './lib/dbHelpers';

// ============================================
// Team Dashboard
// ============================================

// Get team dashboard stats for managers
export const getTeamDashboard = query({
  args: {
    organizationId: v.id('organizations'),
  },
  returns: v.union(
    v.object({
      totalMembers: v.number(),
      activeMembers: v.number(),
      totalPoints: v.number(),
      totalExercises: v.number(),
      avgCompletionPercent: v.number(),
      totalTimeMinutes: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Verify user is admin or manager
    const membership = await getOrgManagerOrAdminMembership(ctx, args.organizationId, identity.subject);
    if (!membership) return null;

    // Get all members
    const members = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
      .collect();

    const memberIds = members.map((m) => m.clerkUserId);

    // Batch fetch all data in parallel (N+1 → 3 parallel batches)
    const [allUserPoints, allProfiles, allChapterProgress] = await Promise.all([
      Promise.all(
        memberIds.map((id) =>
          ctx.db
            .query('userPoints')
            .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', id))
            .first()
        )
      ),
      Promise.all(memberIds.map((id) => getProfileByClerkUserId(ctx, id))),
      Promise.all(
        memberIds.map((id) =>
          ctx.db
            .query('chapterProgress')
            .withIndex('by_user', (q) => q.eq('clerkUserId', id))
            .collect()
        )
      ),
    ]);

    // Build lookup maps
    const pointsMap = new Map(memberIds.map((id, i) => [id, allUserPoints[i]]));
    const profileMap = new Map(memberIds.map((id, i) => [id, allProfiles[i]]));
    const progressMap = new Map(memberIds.map((id, i) => [id, allChapterProgress[i]]));

    // Aggregate stats from all members
    let totalPoints = 0;
    let totalExercises = 0;
    let totalTimeMinutes = 0;
    let activeCount = 0;
    let completionSum = 0;

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const memberId of memberIds) {
      const userPoints = pointsMap.get(memberId);
      if (userPoints) {
        totalPoints += userPoints.totalPoints;
        totalExercises += userPoints.exercisesCompleted;
      }

      const profile = profileMap.get(memberId);
      if (profile?.learningStats) {
        totalTimeMinutes += profile.learningStats.totalTimeSpentMinutes;
        if (profile.learningStats.lastActivityAt > oneWeekAgo) {
          activeCount += 1;
        }
      }

      // Calculate completion
      if (profile?.courseDocumentIds) {
        const chapterProgress = progressMap.get(memberId) ?? [];
        const totalChapters = profile.courseDocumentIds.length * 3;
        const completedChapters = chapterProgress.filter((p) => p.status === 'completed').length;

        if (totalChapters > 0) {
          completionSum += (completedChapters / totalChapters) * 100;
        }
      }
    }

    return {
      totalMembers: members.length,
      activeMembers: activeCount,
      totalPoints,
      totalExercises,
      avgCompletionPercent: members.length > 0 ? Math.round(completionSum / members.length) : 0,
      totalTimeMinutes,
    };
  },
});

// Get progress for each team member
export const getTeamMemberProgress = query({
  args: {
    organizationId: v.id('organizations'),
  },
  returns: v.array(
    v.object({
      clerkUserId: v.string(),
      displayName: v.union(v.string(), v.null()),
      role: v.union(v.literal('admin'), v.literal('manager'), v.literal('member')),
      points: v.number(),
      exercisesCompleted: v.number(),
      completionPercent: v.number(),
      streakDays: v.number(),
      lastActivityAt: v.union(v.number(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify user is admin or manager
    const membership = await getOrgManagerOrAdminMembership(ctx, args.organizationId, identity.subject);
    if (!membership) return [];

    // Get all members
    const members = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
      .collect();

    const memberIds = members.map((m) => m.clerkUserId);

    // Batch fetch all data in parallel (N+1 → 3 parallel batches)
    const [allUserPoints, allProfiles, allChapterProgress] = await Promise.all([
      Promise.all(
        memberIds.map((id) =>
          ctx.db
            .query('userPoints')
            .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', id))
            .first()
        )
      ),
      Promise.all(memberIds.map((id) => getProfileByClerkUserId(ctx, id))),
      Promise.all(
        memberIds.map((id) =>
          ctx.db
            .query('chapterProgress')
            .withIndex('by_user', (q) => q.eq('clerkUserId', id))
            .collect()
        )
      ),
    ]);

    // Build lookup maps
    const pointsMap = new Map(memberIds.map((id, i) => [id, allUserPoints[i]]));
    const profileMap = new Map(memberIds.map((id, i) => [id, allProfiles[i]]));
    const progressMap = new Map(memberIds.map((id, i) => [id, allChapterProgress[i]]));

    const memberProgress = members.map((member) => {
      const memberId = member.clerkUserId;
      const userPoints = pointsMap.get(memberId);
      const profile = profileMap.get(memberId);

      // Calculate completion
      let completionPercent = 0;
      if (profile?.courseDocumentIds && profile.courseDocumentIds.length > 0) {
        const chapterProgress = progressMap.get(memberId) ?? [];
        const totalChapters = profile.courseDocumentIds.length * 3;
        const completedChapters = chapterProgress.filter((p) => p.status === 'completed').length;
        completionPercent = Math.round((completedChapters / totalChapters) * 100);
      }

      return {
        clerkUserId: memberId,
        displayName: member.displayName ?? null,
        role: member.role,
        points: userPoints?.totalPoints ?? 0,
        exercisesCompleted: userPoints?.exercisesCompleted ?? 0,
        completionPercent,
        streakDays: profile?.learningStats?.streakDays ?? 0,
        lastActivityAt: profile?.learningStats?.lastActivityAt ?? null,
      };
    });

    // Sort by points (leaderboard style)
    return memberProgress.sort((a, b) => b.points - a.points);
  },
});

// Get team leaderboard
export const getTeamLeaderboard = query({
  args: {
    organizationId: v.id('organizations'),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      rank: v.number(),
      clerkUserId: v.string(),
      displayName: v.union(v.string(), v.null()),
      points: v.number(),
      exercisesCompleted: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify user is a member
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) => q.eq('organizationId', args.organizationId).eq('clerkUserId', identity.subject))
      .first();

    if (!membership) return [];

    // Get all members
    const members = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
      .collect();

    const memberIds = members.map((m) => m.clerkUserId);

    // Batch fetch all userPoints in parallel (N+1 → 1 parallel batch)
    const allUserPoints = await Promise.all(
      memberIds.map((id) =>
        ctx.db
          .query('userPoints')
          .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', id))
          .first()
      )
    );

    // Build lookup map
    const pointsMap = new Map(memberIds.map((id, i) => [id, allUserPoints[i]]));

    const leaderboard = members
      .map((member) => {
        const userPoints = pointsMap.get(member.clerkUserId);
        if (!userPoints || userPoints.totalPoints <= 0) return null;

        return {
          clerkUserId: member.clerkUserId,
          displayName: member.displayName ?? null,
          points: userPoints.totalPoints,
          exercisesCompleted: userPoints.exercisesCompleted,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    // Sort by points and add ranks
    const sorted = leaderboard.sort((a, b) => b.points - a.points);
    const limit = args.limit ?? 10;

    return sorted.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));
  },
});
