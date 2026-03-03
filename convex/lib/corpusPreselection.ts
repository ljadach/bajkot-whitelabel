/**
 * Corpus preselection — LLM-based filtering of video segments before
 * handbook/playbook generation. Reduces prompt size and improves relevance
 * by sending only matching segments to the final generation step.
 *
 * Data flow:
 *   knowledgeCorpora.segments (JSON) → compact catalog → LLM picks indices
 *   → reconstruct filtered corpus text (YAML-like) for injection into prompt
 */

import { chatJsonWithRetries, LlmLogContext } from './llmClient';
import { getStageConfig } from './pipelineConfig';
import { startActiveObservation } from './langfuse';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

// ActionCtx subset — only what we need for loading corpus from DB
type CorpusLoaderCtx = {
  runQuery: <T>(fn: any, args: any) => Promise<T>;
};

// ── Types ────────────────────────────────────────────────────────────────

/** Structured segment stored in knowledgeCorpora.segments (JSON string). */
export interface CorpusSegment {
  index: number;
  videoFile: string;
  startSeconds: number;
  endSeconds: number;
  description: string;
  teaching_value?: string;
  skill_category?: string;
  difficulty_level?: string;
  feature_area?: string;
  action_type?: string;
  tags: string[];
}

interface PreselectionResult {
  selected: number[];
  reasoning: string;
}

interface CorpusData {
  content: string;
  segments?: string; // JSON array of CorpusSegment[]
}

// Keep profile summary compact for preselection — full XML is wasteful here
const PROFILE_SUMMARY_MAX_CHARS = 800;

/** Minimum duration (seconds) for a video segment to be usable. Clips shorter than this are timestamp errors from Gemini chunking. */
const MIN_SEGMENT_DURATION_SECONDS = 5;

/**
 * Filter segments: remove too-short clips and deduplicate overlapping time ranges.
 * Prevents 1-second timestamp errors and the same segment being embedded 4+ times.
 */
function filterValidSegments<T extends { videoFile: string; startSeconds: number; endSeconds: number }>(segments: T[]): T[] {
  const before = segments.length;

  // 1. Remove segments shorter than minimum duration
  const validDuration = segments.filter((seg) => {
    const duration = seg.endSeconds - seg.startSeconds;
    if (duration < MIN_SEGMENT_DURATION_SECONDS) {
      console.warn(`[corpusPreselection] Dropping short segment ${seg.videoFile} ${seg.startSeconds}→${seg.endSeconds} (${duration.toFixed(1)}s < ${MIN_SEGMENT_DURATION_SECONDS}s)`);
      return false;
    }
    return true;
  });

  // 2. Deduplicate: if same videoFile + >80% time overlap, keep first occurrence
  const deduped: T[] = [];
  for (const seg of validDuration) {
    const isDuplicate = deduped.some((existing) => {
      if (existing.videoFile !== seg.videoFile) return false;
      const overlapStart = Math.max(existing.startSeconds, seg.startSeconds);
      const overlapEnd = Math.min(existing.endSeconds, seg.endSeconds);
      if (overlapEnd <= overlapStart) return false;
      const overlapDuration = overlapEnd - overlapStart;
      const segDuration = seg.endSeconds - seg.startSeconds;
      return overlapDuration / segDuration > 0.8;
    });
    if (!isDuplicate) {
      deduped.push(seg);
    } else {
      console.info(`[corpusPreselection] Dedup overlapping segment ${seg.videoFile} ${seg.startSeconds}→${seg.endSeconds}`);
    }
  }

  if (deduped.length < before) {
    console.info(`[corpusPreselection] Filtered segments: ${before} → ${deduped.length} (${before - deduped.length} removed)`);
  }
  return deduped;
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Select the most relevant corpus segments for a given page/profile context.
 * Returns a YAML-like corpus text containing only the selected segments,
 * ready for injection into the VIDEO_CORPUS prompt variable.
 *
 * Falls back to full corpus if preselection fails or corpus is small enough.
 */
export async function preselectCorpusSegments(params: { corpus: CorpusData; pageContext: string; profileSummary: string; maxSegments?: number; logContext: LlmLogContext }): Promise<string> {
  const { corpus, pageContext, profileSummary, logContext } = params;
  const maxSegments = params.maxSegments ?? 15;

  const rawSegments = parseCorpusSegments(corpus);
  if (!rawSegments || rawSegments.length === 0) {
    return corpus.content;
  }

  // Validate: remove too-short and duplicate segments
  const segments = filterValidSegments(rawSegments);
  if (segments.length === 0) {
    return corpus.content;
  }

  // Skip preselection for small corpora — not worth the extra LLM call
  if (segments.length <= maxSegments) {
    console.info(`[corpusPreselection] Corpus has ${segments.length} segments (≤${maxSegments}), skipping preselection`);
    return corpus.content;
  }

  console.info(`[corpusPreselection] Preselecting from ${segments.length} segments (max ${maxSegments})`);

  try {
    const selectedIndices = await runPreselection({
      segments,
      pageContext,
      profileSummary,
      maxSegments,
      logContext,
    });

    const selectedSegments = selectedIndices.filter((i) => i >= 0 && i < segments.length).map((i) => segments[i]);

    if (selectedSegments.length === 0) {
      console.warn('[corpusPreselection] LLM returned no valid segment indices, using full corpus');
      return corpus.content;
    }

    console.info(`[corpusPreselection] Selected ${selectedSegments.length}/${segments.length} segments`);
    return buildCorpusText(selectedSegments);
  } catch (error) {
    console.warn('[corpusPreselection] Preselection failed, falling back to full corpus:', error instanceof Error ? error.message : error);
    return corpus.content;
  }
}

/**
 * Load the active corpus from DB, run preselection, return the VIDEO CORPUS
 * section string ready for prompt injection. Returns empty string if no corpus.
 *
 * Consolidates the load-corpus → preselect → format pattern used by both
 * generatePlaybook (ai.ts) and generateHandbookInternal (courseAi.ts).
 */
export async function loadAndPreselectCorpus(params: { ctx: CorpusLoaderCtx; pageContext: string; profileXml: string; maxSegments: number; logContext: LlmLogContext; headerLabel?: string }): Promise<string> {
  const label = params.headerLabel ?? 'VIDEO CORPUS:';
  try {
    const activeCorpusId = (await params.ctx.runQuery(internal.admin.config.getInternal, {
      key: 'active_corpus_id',
    })) as string | null;
    if (!activeCorpusId) return '';

    const corpus = (await params.ctx.runQuery(internal.admin.corpus.getInternal, {
      corpusId: activeCorpusId as Id<'knowledgeCorpora'>,
    })) as { content: string; segments?: string | null } | null;
    if (!corpus?.content) return '';

    const filtered = await preselectCorpusSegments({
      corpus: { content: corpus.content, segments: corpus.segments ?? undefined },
      pageContext: params.pageContext,
      profileSummary: params.profileXml.slice(0, PROFILE_SUMMARY_MAX_CHARS),
      maxSegments: params.maxSegments,
      logContext: params.logContext,
    });

    return [label, filtered, ''].join('\n');
  } catch (e) {
    console.warn('[loadAndPreselectCorpus] Failed:', e instanceof Error ? e.message : e);
    return '';
  }
}

// ── Internal ─────────────────────────────────────────────────────────────

/** Parse segments from corpus — prefer structured JSON, fall back to legacy text. */
function parseCorpusSegments(corpus: CorpusData): CorpusSegment[] | null {
  if (corpus.segments) {
    try {
      const parsed = JSON.parse(corpus.segments) as CorpusSegment[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      console.warn('[corpusPreselection] Failed to parse corpus.segments JSON');
    }
  }

  // Legacy corpora without structured segments — parse from YAML-like text
  return parseCorpusText(corpus.content);
}

/** Parse legacy YAML-like corpus text into structured segments. */
function parseCorpusText(content: string): CorpusSegment[] | null {
  if (!content?.trim()) return null;

  const segments: CorpusSegment[] = [];
  const segmentBlocks = content.split(/^- videoFile:/m).slice(1); // split on segment boundaries

  for (const block of segmentBlocks) {
    const fullBlock = `- videoFile:${block}`;
    const get = (key: string): string | undefined => {
      const match = fullBlock.match(new RegExp(`${key}:\\s*(.+)`));
      return match?.[1]?.trim();
    };
    const getNum = (key: string): number => {
      const val = get(key);
      return val ? parseFloat(val) : 0;
    };

    const tagsStr = get('tags');
    let tags: string[] = [];
    if (tagsStr) {
      tags = tagsStr
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }

    segments.push({
      index: segments.length,
      videoFile: get('videoFile') || '',
      startSeconds: getNum('startSeconds'),
      endSeconds: getNum('endSeconds'),
      description: get('description') || '',
      teaching_value: get('teaching_value'),
      skill_category: get('skill_category'),
      difficulty_level: get('difficulty_level'),
      feature_area: get('feature_area'),
      action_type: get('action_type'),
      tags,
    });
  }

  return segments.length > 0 ? segments : null;
}

/**
 * Build a compact catalog string for the preselection LLM.
 * ~30-40 tokens per segment vs ~125 for the full YAML format.
 * Omits videoFile/timestamps (not needed for relevance judgment).
 */
function buildCatalog(segments: CorpusSegment[]): string {
  return segments
    .map((seg) => {
      const cat = seg.skill_category || '?';
      const diff = seg.difficulty_level || '?';
      const tags = seg.tags.length > 0 ? ` [${seg.tags.join(', ')}]` : '';
      const teaching = seg.teaching_value ? ` | ${seg.teaching_value}` : '';
      return `[${seg.index}] ${cat}/${diff}: "${seg.description}"${teaching}${tags}`;
    })
    .join('\n');
}

/** Reconstruct YAML-like corpus text from structured segments (with full data for embedding). */
export function buildCorpusText(segments: CorpusSegment[]): string {
  const filtered = filterValidSegments(segments);
  const lines: string[] = [];
  let currentVideo = '';

  for (const seg of filtered) {
    if (seg.videoFile !== currentVideo) {
      currentVideo = seg.videoFile;
      lines.push(`\n## Video: ${currentVideo}\n`);
    }
    lines.push(`- videoFile: ${seg.videoFile}`);
    lines.push(`  startSeconds: ${seg.startSeconds}`);
    lines.push(`  endSeconds: ${seg.endSeconds}`);
    lines.push(`  description: ${seg.description}`);
    if (seg.teaching_value) lines.push(`  teaching_value: ${seg.teaching_value}`);
    if (seg.skill_category) lines.push(`  skill_category: ${seg.skill_category}`);
    if (seg.difficulty_level) lines.push(`  difficulty_level: ${seg.difficulty_level}`);
    if (seg.feature_area) lines.push(`  feature_area: ${seg.feature_area}`);
    if (seg.action_type) lines.push(`  action_type: ${seg.action_type}`);
    lines.push(`  tags: [${seg.tags.join(', ')}]`);
    lines.push('');
  }

  return lines.join('\n');
}

const PRESELECTION_SYSTEM = [
  'You are a content curator selecting video segments for a personalized AI training course.',
  'Given a catalog of available segments, pick the ones most relevant to the target page and learner.',
  '',
  'Selection criteria (priority order):',
  '1. skill_category must match the page topic',
  '2. difficulty_level should match the learner level',
  '3. teaching_value should be relevant to the concepts being taught',
  '4. Prefer segments with tags "verified" or "highlight"',
  '5. Prefer variety — avoid picking multiple segments showing the same action',
  '',
  'Return JSON only: { "selected": [0, 2, 5, ...], "reasoning": "brief explanation" }',
].join('\n');

function buildPreselectionUserPrompt(params: { catalog: string; pageContext: string; profileSummary: string; maxSegments: number }): string {
  return ['LEARNER:', params.profileSummary, '', 'TARGET PAGE:', params.pageContext, '', `Select up to ${params.maxSegments} segments from the catalog below.`, '', 'SEGMENT CATALOG:', params.catalog].join('\n');
}

async function runPreselection(params: { segments: CorpusSegment[]; pageContext: string; profileSummary: string; maxSegments: number; logContext: LlmLogContext }): Promise<number[]> {
  const catalog = buildCatalog(params.segments);
  // Use intake model for preselection — cheap, fast, good enough for filtering
  const model = getStageConfig('intake').model;

  return startActiveObservation(
    'corpusPreselection.run',
    async (span) => {
      span.update({
        action: 'corpusPreselection',
        total_segments: params.segments.length,
        max_segments: params.maxSegments,
        catalog_length: catalog.length,
      });

      const result = await chatJsonWithRetries<PreselectionResult>(
        {
          system: PRESELECTION_SYSTEM,
          user: buildPreselectionUserPrompt({
            catalog,
            pageContext: params.pageContext,
            profileSummary: params.profileSummary,
            maxSegments: params.maxSegments,
          }),
          model,
          temperature: 0.2,
          expect: 'object',
          action: 'corpusPreselection',
        },
        2, // fewer retries — this is an optimization step, not critical
        200,
        undefined, // no fallback — let caller handle failure
        params.logContext
      );

      if (!Array.isArray(result?.selected)) {
        throw new Error('Preselection did not return a selected array');
      }

      const indices = result.selected.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)).map((n) => Math.round(n));

      span.update({
        selected_count: indices.length,
        reasoning: result.reasoning || '',
      });

      return indices;
    },
    { asType: 'span' }
  );
}
