/**
 * Debug utility for dumping generated content for quality analysis.
 * Run via: npx convex run admin/debugContent:dumpHandbooks '{"clerkUserId": "..."}'
 */
import { action, internalAction, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';
import { assertAdmin } from '../lib/roles';

/** Public admin action to dump course content for a user (called from debug panel). */
export const dumpCourseForUser = action({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    const { subject: clerkUserId } = await assertAdmin(ctx);
    return ctx.runAction(internal.admin.debugContent.dumpHandbooks, { clerkUserId });
  },
});

/** Dump all handbooks + profile + playbook for a user. */
export const dumpHandbooks = internalAction({
  args: { clerkUserId: v.string() },
  returns: v.string(),
  handler: async (ctx, { clerkUserId }) => {
    const profile = await ctx.runQuery(internal.courseAiHelpers.getProfileForCourseGeneration, {
      clerkUserId,
    });

    if (!profile) return 'Profile not found';

    const lines: string[] = ['=== CONTENT QUALITY DUMP ===', ''];

    // Profile XML
    lines.push('--- PROFILE XML ---');
    lines.push(profile.profileXml || '(empty)');
    lines.push('');

    // Assessment
    lines.push('--- ASSESSMENT REPORT ---');
    lines.push(profile.assessmentReport || '(empty)');
    lines.push('');

    // Plan outline
    lines.push('--- PLAN OUTLINE ---');
    lines.push(profile.planOutline || '(empty)');
    lines.push('');

    // Plan full (first 3000 chars)
    lines.push('--- PLAN FULL (truncated) ---');
    lines.push((profile.planFull || '(empty)').slice(0, 3000));
    lines.push('');

    // Course documents
    const docs = await ctx.runQuery(internal.admin.debugContent.getDocsByUser, { clerkUserId });
    if (!docs || docs.length === 0) {
      lines.push('--- NO COURSE DOCUMENTS ---');
    } else {
      for (const doc of docs) {
        lines.push(`--- HANDBOOK: ${doc.pageTitle} [${doc.status}] ---`);
        if (doc.handbook) {
          for (const [key, chapter] of Object.entries(doc.handbook)) {
            const ch = chapter as { title: string; content: string };
            lines.push(`\n## ${key}: ${ch.title}`);
            lines.push(ch.content);
          }
        } else if (doc.error) {
          lines.push(`ERROR: ${doc.error}`);
        }
        lines.push('');
      }
    }

    // Exercises
    const exercises = await ctx.runQuery(internal.admin.debugContent.getExercisesByUser, { clerkUserId });
    if (exercises && exercises.length > 0) {
      lines.push(`--- EXERCISES (${exercises.length} total) ---`);
      for (const ex of exercises) {
        lines.push(`\n[${ex.exerciseType}] ${ex.pageTitle} — Chapter ${ex.chapterNumber}:`);
        lines.push(`Prompt: ${ex.prompt}`);
        lines.push(`Hints: ${JSON.stringify(ex.hints)}`);
        lines.push(`Rubric: ${ex.rubric || '(none)'}`);
      }
      lines.push('');
    } else {
      lines.push('--- NO EXERCISES (may still be generating async) ---');
      lines.push('');
    }

    const output = lines.join('\n');
    console.log(output);
    return output;
  },
});

export const getDocsByUser = internalQuery({
  args: { clerkUserId: v.string() },
  returns: v.array(
    v.object({
      pageTitle: v.string(),
      pageIndex: v.number(),
      status: v.string(),
      error: v.optional(v.string()),
      handbook: v.optional(
        v.object({
          chapter1: v.object({ title: v.string(), content: v.string() }),
          chapter2: v.object({ title: v.string(), content: v.string() }),
          chapter3: v.object({ title: v.string(), content: v.string() }),
        })
      ),
    })
  ),
  handler: async (ctx, { clerkUserId }) => {
    const docs = await ctx.db
      .query('courseDocuments')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', clerkUserId))
      .collect();

    return docs
      .sort((a, b) => a.pageIndex - b.pageIndex)
      .map((d) => ({
        pageTitle: d.pageTitle,
        pageIndex: d.pageIndex,
        status: d.status,
        error: d.error,
        handbook: d.handbook
          ? {
              chapter1: { title: d.handbook.chapter1.title, content: d.handbook.chapter1.content },
              chapter2: { title: d.handbook.chapter2.title, content: d.handbook.chapter2.content },
              chapter3: { title: d.handbook.chapter3.title, content: d.handbook.chapter3.content },
            }
          : undefined,
      }));
  },
});

export const getExercisesByUser = internalQuery({
  args: { clerkUserId: v.string() },
  returns: v.array(
    v.object({
      pageTitle: v.string(),
      chapterNumber: v.number(),
      exerciseType: v.string(),
      prompt: v.string(),
      hints: v.optional(v.array(v.string())),
      rubric: v.optional(v.string()),
    })
  ),
  handler: async (ctx, { clerkUserId }) => {
    // Get user's course documents
    const docs = await ctx.db
      .query('courseDocuments')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', clerkUserId))
      .collect();

    const exercises = [];
    for (const doc of docs) {
      const exs = await ctx.db
        .query('exercises')
        .withIndex('by_document_chapter', (q) => q.eq('courseDocumentId', doc._id))
        .collect();
      for (const ex of exs) {
        exercises.push({
          pageTitle: doc.pageTitle,
          chapterNumber: ex.chapterNumber,
          exerciseType: ex.exerciseType,
          prompt: ex.prompt,
          hints: ex.hints,
          rubric: ex.rubric,
        });
      }
    }
    return exercises;
  },
});
