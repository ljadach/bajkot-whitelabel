/**
 * Book pipeline prompts stored in the bookPrompts table and loaded by agents
 * at runtime (code fallbacks in lib/prompts/bookFallbacks.ts when the DB is
 * empty). Version history lives in bookPromptVersions.
 *
 * The white-label build has no admin panel — prompts are managed from the CLI
 * (`npm run cli -- prompts ...`) or with `npx convex run` against the internal
 * functions below: seedPrompts, exportAllPrompts, importPrompt.
 */

import { internalMutation, internalQuery } from '../_generated/server';
import { v } from 'convex/values';
import { PromptTemplate, normalizeFallback } from '../lib/prompts/types';
import { bookFallbacks } from '../lib/prompts/bookFallbacks';

// Map PromptTemplate keys to human-readable agent names
export const BOOK_PROMPT_META: Record<string, { agent: string; filename: string }> = {
  [PromptTemplate.BookIntake]: { agent: 'A0 — Intake', filename: 'A0_intake' },
  [PromptTemplate.BookChildProfiler]: {
    agent: 'A1 — Child Profiler',
    filename: 'A1_child_profiler',
  },
  [PromptTemplate.BookStoryArchitect]: {
    agent: 'A2 — Story Architect',
    filename: 'A2_story_architect',
  },
  [PromptTemplate.BookStoryWriter]: { agent: 'A3 — Story Writer', filename: 'A3_story_writer' },
  [PromptTemplate.BookPsychReviewer]: {
    agent: 'A4 — Psych Reviewer',
    filename: 'A4_psych_reviewer',
  },
  [PromptTemplate.BookArtDirector]: { agent: 'A5 — Art Director', filename: 'A5_art_director' },
  [PromptTemplate.BookCharacterDesigner]: {
    agent: 'A6 — Character Designer',
    filename: 'A6_character_designer',
  },
  [PromptTemplate.BookStyleVote]: { agent: 'A6b — Style Vote', filename: 'A6b_style_vote' },
  [PromptTemplate.BookIllustrator]: { agent: 'A7 — Illustrator', filename: 'A7_illustrator' },
  [PromptTemplate.BookVisualQa]: { agent: 'A8 — Visual QA', filename: 'A8_visual_qa' },
  [PromptTemplate.BookComposer]: { agent: 'A9 — Composer', filename: 'A9_composer' },
  [PromptTemplate.BookFinalQa]: { agent: 'A10 — Final QA', filename: 'A10_final_qa' },
  [PromptTemplate.BookDelivery]: { agent: 'A11 — Delivery', filename: 'A11_delivery' },
  [PromptTemplate.BookPipelineIndex]: { agent: 'Index', filename: 'index' },
};

// ── Helper: get next version number for a prompt key ──────────

export async function getNextVersion(
  ctx: { db: { query: (table: 'bookPromptVersions') => any } },
  promptKey: string,
): Promise<number> {
  const latest = await ctx.db
    .query('bookPromptVersions')
    .withIndex('by_prompt_key_version', (q: any) => q.eq('promptKey', promptKey))
    .order('desc')
    .first();
  return latest ? latest.version + 1 : 1;
}

// ── Helper: save current content as a version snapshot ─────────

export async function saveVersionSnapshot(
  ctx: { db: any },
  promptKey: string,
  content: string,
  editedBy: string,
  changeNote?: string,
): Promise<number> {
  const version = await getNextVersion(ctx, promptKey);
  await ctx.db.insert('bookPromptVersions', {
    promptKey,
    content,
    version,
    editedBy,
    editedAt: Date.now(),
    changeNote,
  });
  return version;
}

// ── Get prompt for a specific template (used by agents) ───────

export const getPrompt = internalQuery({
  args: { templateKey: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { templateKey }) => {
    const meta = BOOK_PROMPT_META[templateKey];
    if (!meta) return null;

    const entry = await ctx.db
      .query('bookPrompts')
      .withIndex('by_filename', (q) => q.eq('filename', meta.filename))
      .first();

    return entry?.content ?? null;
  },
});

// ── Seed prompts from bookFallbacks → DB (one-time migration) ─

export const seedPrompts = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    let seeded = 0;
    for (const [templateKey, config] of Object.entries(bookFallbacks)) {
      if (!config) continue;
      const meta = BOOK_PROMPT_META[templateKey];
      if (!meta) continue;

      // Skip if already exists in DB (idempotent)
      const existing = await ctx.db
        .query('bookPrompts')
        .withIndex('by_filename', (q) => q.eq('filename', meta.filename))
        .first();

      if (existing) continue;

      await ctx.db.insert('bookPrompts', {
        filename: meta.filename,
        agentName: meta.agent,
        content: normalizeFallback(config.fallback),
        isModified: false,
        updatedAt: Date.now(),
      });
      seeded++;
    }

    return seeded;
  },
});

// ── Export all prompts (CLI: npx convex run admin/bookPrompts:exportAllPrompts) ─

export const exportAllPrompts = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      filename: v.string(),
      agentName: v.string(),
      content: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const results = [];

    for (const meta of Object.values(BOOK_PROMPT_META)) {
      const entry = await ctx.db
        .query('bookPrompts')
        .withIndex('by_filename', (q) => q.eq('filename', meta.filename))
        .first();

      if (entry) {
        results.push({
          filename: entry.filename,
          agentName: entry.agentName,
          content: entry.content,
        });
      }
    }

    return results;
  },
});

// ── Import single prompt (CLI: npx convex run admin/bookPrompts:importPrompt) ─

export const importPrompt = internalMutation({
  args: {
    filename: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { filename, content }) => {
    // Find agent name from meta
    const meta = Object.values(BOOK_PROMPT_META).find((m) => m.filename === filename);
    const agentName = meta?.agent ?? filename;

    const existing = await ctx.db
      .query('bookPrompts')
      .withIndex('by_filename', (q) => q.eq('filename', filename))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content,
        isModified: true,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('bookPrompts', {
        filename,
        agentName,
        content,
        isModified: true,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});
