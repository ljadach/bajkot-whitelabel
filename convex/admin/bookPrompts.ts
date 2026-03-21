/**
 * Admin CRUD for book pipeline prompts.
 * Prompts are stored in the bookPrompts table and loaded by agents at runtime.
 * Version history tracked in bookPromptVersions table.
 * CLI sync: seedPrompts (migration), exportAllPrompts, importPrompt.
 */

import { internalMutation, internalQuery, mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { assertAdmin } from '../lib/roles';
import { auditLog } from '../lib/adminGuards';
import { PromptTemplate } from '../lib/prompts/types';
import { bookFallbacks } from '../lib/prompts/bookFallbacks';

// Map PromptTemplate keys to human-readable agent names
const BOOK_PROMPT_META: Record<string, { agent: string; filename: string }> = {
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

// Valid PromptTemplate values for import validation
const VALID_PROMPT_KEYS = new Set(Object.values(PromptTemplate) as string[]);

// ── Helper: get next version number for a prompt key ──────────

async function getNextVersion(
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

async function saveVersionSnapshot(
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

// ── List all book prompts from DB ─────────────────────────────

export const listBookPrompts = query({
  args: {},
  returns: v.array(
    v.object({
      key: v.string(),
      agentName: v.string(),
      filename: v.string(),
      dbContent: v.union(v.string(), v.null()),
      hasPrompt: v.boolean(),
      versionCount: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await assertAdmin(ctx);

    const results = [];

    for (const [templateKey, meta] of Object.entries(BOOK_PROMPT_META)) {
      const dbEntry = await ctx.db
        .query('bookPrompts')
        .withIndex('by_filename', (q) => q.eq('filename', meta.filename))
        .first();

      // Count versions for this prompt key
      const versions = await ctx.db
        .query('bookPromptVersions')
        .withIndex('by_prompt_key', (q) => q.eq('promptKey', templateKey))
        .collect();

      results.push({
        key: templateKey,
        agentName: meta.agent,
        filename: meta.filename,
        dbContent: dbEntry?.content ?? null,
        hasPrompt: !!dbEntry,
        versionCount: versions.length,
      });
    }

    return results;
  },
});

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

// ── Save prompt (admin UI) ────────────────────────────────────

export const saveBookPrompt = mutation({
  args: {
    templateKey: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { templateKey, content }) => {
    const { subject } = await assertAdmin(ctx);

    const meta = BOOK_PROMPT_META[templateKey];
    if (!meta) throw new Error(`Unknown template key: ${templateKey}`);

    const existing = await ctx.db
      .query('bookPrompts')
      .withIndex('by_filename', (q) => q.eq('filename', meta.filename))
      .first();

    // Save current content as a version BEFORE overwriting
    if (existing) {
      await saveVersionSnapshot(ctx, templateKey, existing.content, subject);
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        content,
        isModified: true,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('bookPrompts', {
        filename: meta.filename,
        agentName: meta.agent,
        content,
        isModified: true,
        updatedAt: Date.now(),
      });
    }

    await auditLog(ctx, subject, 'bookPrompts.save', meta.filename, {
      templateKey,
      contentLength: content.length,
    });

    return null;
  },
});

// ── Reset prompt (delete from DB) ─────────────────────────────

export const resetBookPrompt = mutation({
  args: { templateKey: v.string() },
  returns: v.null(),
  handler: async (ctx, { templateKey }) => {
    const { subject } = await assertAdmin(ctx);

    const meta = BOOK_PROMPT_META[templateKey];
    if (!meta) throw new Error(`Unknown template key: ${templateKey}`);

    const existing = await ctx.db
      .query('bookPrompts')
      .withIndex('by_filename', (q) => q.eq('filename', meta.filename))
      .first();

    if (existing) {
      // Save current content as version before resetting
      await saveVersionSnapshot(ctx, templateKey, existing.content, subject, 'Before reset');
      await ctx.db.delete(existing._id);
    }

    await auditLog(ctx, subject, 'bookPrompts.reset', meta.filename, { templateKey });

    return null;
  },
});

// ── List versions for a prompt ────────────────────────────────

export const listPromptVersions = query({
  args: { promptKey: v.string() },
  returns: v.array(
    v.object({
      _id: v.id('bookPromptVersions'),
      promptKey: v.string(),
      version: v.number(),
      editedBy: v.string(),
      editedAt: v.number(),
      changeNote: v.union(v.string(), v.null()),
      contentPreview: v.string(),
    }),
  ),
  handler: async (ctx, { promptKey }) => {
    await assertAdmin(ctx);

    const versions = await ctx.db
      .query('bookPromptVersions')
      .withIndex('by_prompt_key_version', (q) => q.eq('promptKey', promptKey))
      .order('desc')
      .take(50);

    return versions.map((ver) => ({
      _id: ver._id,
      promptKey: ver.promptKey,
      version: ver.version,
      editedBy: ver.editedBy,
      editedAt: ver.editedAt,
      changeNote: ver.changeNote ?? null,
      contentPreview: ver.content.slice(0, 200),
    }));
  },
});

// ── Get full content of a specific version ────────────────────

export const getPromptVersion = query({
  args: { versionId: v.id('bookPromptVersions') },
  returns: v.object({
    content: v.string(),
    version: v.number(),
    editedBy: v.string(),
    editedAt: v.number(),
    changeNote: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, { versionId }) => {
    await assertAdmin(ctx);

    const ver = await ctx.db.get(versionId);
    if (!ver) throw new Error('Version not found');

    return {
      content: ver.content,
      version: ver.version,
      editedBy: ver.editedBy,
      editedAt: ver.editedAt,
      changeNote: ver.changeNote ?? null,
    };
  },
});

// ── Restore a previous version ────────────────────────────────

export const restorePromptVersion = mutation({
  args: {
    promptKey: v.string(),
    versionId: v.id('bookPromptVersions'),
  },
  returns: v.null(),
  handler: async (ctx, { promptKey, versionId }) => {
    const { subject } = await assertAdmin(ctx);

    const meta = BOOK_PROMPT_META[promptKey];
    if (!meta) throw new Error(`Unknown template key: ${promptKey}`);

    const ver = await ctx.db.get(versionId);
    if (!ver) throw new Error('Version not found');
    if (ver.promptKey !== promptKey) throw new Error('Version does not belong to this prompt');

    // Save current content as a version before overwriting
    const existing = await ctx.db
      .query('bookPrompts')
      .withIndex('by_filename', (q) => q.eq('filename', meta.filename))
      .first();

    if (existing) {
      await saveVersionSnapshot(ctx, promptKey, existing.content, subject);
    }

    // Write the restored content
    const restoredContent = ver.content;
    if (existing) {
      await ctx.db.patch(existing._id, {
        content: restoredContent,
        isModified: true,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('bookPrompts', {
        filename: meta.filename,
        agentName: meta.agent,
        content: restoredContent,
        isModified: true,
        updatedAt: Date.now(),
      });
    }

    // Record the restore as a new version entry
    await saveVersionSnapshot(
      ctx,
      promptKey,
      restoredContent,
      subject,
      `Restored from v${ver.version}`,
    );

    await auditLog(ctx, subject, 'bookPrompts.restore', meta.filename, {
      promptKey,
      restoredFromVersion: ver.version,
      contentLength: restoredContent.length,
    });

    return null;
  },
});

// ── Export single prompt as JSON (admin UI) ───────────────────

export const exportPrompt = query({
  args: { promptKey: v.string() },
  returns: v.string(),
  handler: async (ctx, { promptKey }) => {
    await assertAdmin(ctx);

    const meta = BOOK_PROMPT_META[promptKey];
    if (!meta) throw new Error(`Unknown template key: ${promptKey}`);

    const entry = await ctx.db
      .query('bookPrompts')
      .withIndex('by_filename', (q) => q.eq('filename', meta.filename))
      .first();

    if (!entry) throw new Error(`Prompt not found in DB: ${promptKey}`);

    // Get latest version number
    const latestVer = await ctx.db
      .query('bookPromptVersions')
      .withIndex('by_prompt_key_version', (q) => q.eq('promptKey', promptKey))
      .order('desc')
      .first();

    return JSON.stringify(
      {
        promptKey,
        agentName: meta.agent,
        content: entry.content,
        exportedAt: new Date().toISOString(),
        version: latestVer?.version ?? 0,
      },
      null,
      2,
    );
  },
});

// ── Export ALL prompts as JSON (admin UI) ──────────────────────

export const exportAllPromptsAdmin = query({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await assertAdmin(ctx);

    const results = [];

    for (const [templateKey, meta] of Object.entries(BOOK_PROMPT_META)) {
      const entry = await ctx.db
        .query('bookPrompts')
        .withIndex('by_filename', (q) => q.eq('filename', meta.filename))
        .first();

      if (entry) {
        const latestVer = await ctx.db
          .query('bookPromptVersions')
          .withIndex('by_prompt_key_version', (q) => q.eq('promptKey', templateKey))
          .order('desc')
          .first();

        results.push({
          promptKey: templateKey,
          agentName: meta.agent,
          content: entry.content,
          exportedAt: new Date().toISOString(),
          version: latestVer?.version ?? 0,
        });
      }
    }

    return JSON.stringify(results, null, 2);
  },
});

// ── Import single prompt (admin UI) ───────────────────────────

export const importPromptAdmin = mutation({
  args: {
    promptKey: v.string(),
    content: v.string(),
    changeNote: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { promptKey, content, changeNote }) => {
    const { subject } = await assertAdmin(ctx);

    if (!VALID_PROMPT_KEYS.has(promptKey)) {
      throw new Error(`Invalid promptKey: ${promptKey}. Must be a valid PromptTemplate value.`);
    }

    const meta = BOOK_PROMPT_META[promptKey];
    if (!meta) throw new Error(`Unknown template key: ${promptKey}`);

    const existing = await ctx.db
      .query('bookPrompts')
      .withIndex('by_filename', (q) => q.eq('filename', meta.filename))
      .first();

    // Save current content as version before overwriting
    if (existing) {
      await saveVersionSnapshot(ctx, promptKey, existing.content, subject);
    }

    // Write new content
    if (existing) {
      await ctx.db.patch(existing._id, {
        content,
        isModified: true,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('bookPrompts', {
        filename: meta.filename,
        agentName: meta.agent,
        content,
        isModified: true,
        updatedAt: Date.now(),
      });
    }

    // Record as a new version
    await saveVersionSnapshot(ctx, promptKey, content, subject, changeNote ?? 'Imported from file');

    await auditLog(ctx, subject, 'bookPrompts.import', meta.filename, {
      promptKey,
      contentLength: content.length,
      changeNote,
    });

    return null;
  },
});

// ── Import all prompts from JSON (admin UI) ───────────────────

export const importAllPromptsAdmin = mutation({
  args: {
    data: v.string(),
  },
  returns: v.object({
    imported: v.number(),
    failed: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, { data }) => {
    const { subject } = await assertAdmin(ctx);

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      throw new Error('Invalid JSON');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Expected JSON array');
    }

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of parsed) {
      if (!item || typeof item !== 'object') {
        errors.push('Skipped non-object entry');
        failed++;
        continue;
      }

      const { promptKey, content } = item as { promptKey?: string; content?: string };

      if (!promptKey || typeof promptKey !== 'string') {
        errors.push('Entry missing promptKey');
        failed++;
        continue;
      }

      if (!content || typeof content !== 'string') {
        errors.push(`${promptKey}: missing content`);
        failed++;
        continue;
      }

      if (!VALID_PROMPT_KEYS.has(promptKey)) {
        errors.push(`${promptKey}: invalid promptKey`);
        failed++;
        continue;
      }

      const meta = BOOK_PROMPT_META[promptKey];
      if (!meta) {
        errors.push(`${promptKey}: no meta mapping`);
        failed++;
        continue;
      }

      const existing = await ctx.db
        .query('bookPrompts')
        .withIndex('by_filename', (q) => q.eq('filename', meta.filename))
        .first();

      // Save current content as version before overwriting
      if (existing) {
        await saveVersionSnapshot(ctx, promptKey, existing.content, subject);
      }

      if (existing) {
        await ctx.db.patch(existing._id, {
          content,
          isModified: true,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert('bookPrompts', {
          filename: meta.filename,
          agentName: meta.agent,
          content,
          isModified: true,
          updatedAt: Date.now(),
        });
      }

      // Record as version
      await saveVersionSnapshot(ctx, promptKey, content, subject, 'Bulk import');

      imported++;
    }

    await auditLog(ctx, subject, 'bookPrompts.importAll', undefined, {
      imported,
      failed,
      errors,
    });

    return { imported, failed, errors };
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
        content: config.fallback,
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
