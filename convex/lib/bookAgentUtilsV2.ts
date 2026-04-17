/**
 * Normalizers for the 2026-04-16 prompt refactor (A3 + A5).
 *
 * Prompt and orchestrator output schemas changed:
 *  - A3: `{ beats: [{ beat_id, text_pl, word_count }] }` (no title/dedication/parentCard)
 *  - A5: `illustrations[]` with `id`, `beat_ref:string|null`, `composition`,
 *        `mood`, `illustration_prompt`, `negative_prompt`, `characters_present`,
 *        `visual_anchor_visible`, `aspect_ratio`, `category`.
 *
 * These normalizers tolerate both NEW and LEGACY shapes so the pipeline can
 * handle orders in flight during the rollout.
 */

import type { StoryDraft, StoryPage, IllustrationPlan, IllustrationSpec } from './bookTypes';

/** Return the first candidate that is a non-empty string, else the fallback. */
function firstString(candidates: unknown[], fallback = ''): string {
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) return c;
  }
  return fallback;
}

// ── A3: Story draft ──────────────────────────────────────

/**
 * Pull a pages[] from an A3 response. Accepts:
 *  - NEW: { beats: [{ beat_id, text_pl, word_count }] }
 *  - LEGACY: { pages: [{ beatNumber, text, readAloudVersion }] }
 *  - LEGACY: { scenes: [{ beat_number, text_pl }] }
 *  - LEGACY: { story_text: string[] }
 */
export function normalizePagesV2(raw: any): StoryPage[] {
  if (!raw || typeof raw !== 'object') return [];

  // Preferred: beats[] with beat_id + text_pl (NEW schema)
  if (Array.isArray(raw.beats) && raw.beats.length > 0) {
    return raw.beats.map((b: any, i: number) => {
      const beatId =
        typeof b.beat_id === 'string'
          ? b.beat_id
          : typeof b.beatId === 'string'
            ? b.beatId
            : undefined;
      const beatNumber =
        typeof b.beatNumber === 'number'
          ? b.beatNumber
          : typeof b.beat_number === 'number'
            ? b.beat_number
            : i + 1;
      const text: string = b.text_pl ?? b.text ?? '';
      return {
        beatNumber,
        beatId,
        text,
        readAloudVersion: b.readAloudVersion ?? b.read_aloud_version ?? text,
        wordCount: typeof b.word_count === 'number' ? b.word_count : b.wordCount,
      };
    });
  }

  // Legacy pages[]
  if (Array.isArray(raw.pages) && raw.pages.length > 0) {
    return raw.pages.map((p: any, i: number) => ({
      beatNumber: p.beatNumber ?? p.beat_number ?? i + 1,
      beatId: typeof p.beat_id === 'string' ? p.beat_id : undefined,
      text: p.text ?? p.text_pl ?? '',
      readAloudVersion: p.readAloudVersion ?? p.text_pl ?? p.text ?? '',
      wordCount: typeof p.wordCount === 'number' ? p.wordCount : p.word_count,
    }));
  }

  // Legacy scenes[]
  if (Array.isArray(raw.scenes) && raw.scenes.length > 0) {
    return raw.scenes.map((s: any, i: number) => ({
      beatNumber: s.beatNumber ?? s.beat_number ?? i + 1,
      text: s.text_pl ?? s.text ?? '',
      readAloudVersion: s.readAloudVersion ?? s.text_pl ?? s.text ?? '',
    }));
  }

  // Legacy story_text (array of strings)
  if (Array.isArray(raw.story_text) && raw.story_text.length > 0) {
    return raw.story_text.map((txt: any, i: number) => ({
      beatNumber: i + 1,
      text: String(txt ?? ''),
      readAloudVersion: String(txt ?? ''),
    }));
  }

  return [];
}

/** Build a full StoryDraft from arbitrary A3 output. Dedication may be empty. */
export function normalizeStoryDraftV2(raw: any, childName: string): StoryDraft {
  const pages = normalizePagesV2(raw);
  const nameRx = /\[name\]|\{name\}/gi;
  const sub = (s: string): string => s.replace(nameRx, childName);

  const title = typeof raw?.title === 'string' ? sub(raw.title) : '';
  // Dedication is no longer produced by A3 in NEW schema; keep if legacy sent it.
  const dedicationRaw = typeof raw?.dedication === 'string' ? raw.dedication : '';
  const dedication = sub(dedicationRaw);
  const coverBlurbRaw =
    typeof raw?.coverBlurb === 'string'
      ? raw.coverBlurb
      : typeof raw?.cover_blurb === 'string'
        ? raw.cover_blurb
        : '';
  const coverBlurb = sub(coverBlurbRaw);

  // Parent card — legacy callers may still ship one. V2 expects it from A2 blueprint.
  const pcRaw = raw?.parentCard ?? raw?.parent_card;
  const parentCard = pcRaw
    ? {
        title: pcRaw.title ?? 'Drogi Rodzicu',
        introPl: pcRaw.introPl ?? pcRaw.intro_pl ?? '',
        questions: Array.isArray(pcRaw.questions) ? pcRaw.questions : [],
        activityPl: pcRaw.activityPl ?? pcRaw.activity_pl ?? '',
      }
    : undefined;

  const wordCount =
    typeof raw?.wordCount === 'number'
      ? raw.wordCount
      : typeof raw?.total_word_count === 'number'
        ? raw.total_word_count
        : pages.reduce((sum, p) => sum + (p.wordCount ?? 0), 0);

  return { title, dedication, pages, wordCount, coverBlurb, parentCard };
}

// ── A5: Illustration plan ────────────────────────────────

/** Normalize a single A5 illustration entry, preserving all new fields. */
export function normalizeIllustrationSpec(ill: any, index: number): IllustrationSpec {
  const id = firstString([ill?.id, ill?.illustrationId], `illustration_${index}`);

  const rawBeatRef = ill?.beat_ref !== undefined ? ill.beat_ref : ill?.beatRef;
  let beatRef: string | null;
  if (rawBeatRef === null || rawBeatRef === undefined) beatRef = null;
  else if (typeof rawBeatRef === 'string') beatRef = rawBeatRef;
  else if (typeof rawBeatRef === 'number') beatRef = String(rawBeatRef);
  else beatRef = null;

  let category: IllustrationSpec['category'];
  if (ill?.category === 'cover' || ill?.category === 'scene' || ill?.category === 'mood') {
    category = ill.category;
  } else if (id === 'cover') {
    category = 'cover';
  } else if (id.startsWith('mood_')) {
    category = 'mood';
  } else {
    category = 'scene';
  }

  const aspectRatio = firstString(
    [ill?.aspect_ratio, ill?.aspectRatio],
    category === 'cover' ? '2:3' : '3:2',
  );

  const composition = firstString([ill?.composition, ill?.sceneDescription]);
  const mood = firstString([ill?.mood]);
  const illustrationPrompt = firstString([
    ill?.illustration_prompt,
    ill?.illustrationPrompt,
    ill?.prompt,
  ]);
  const negativePrompt = firstString([ill?.negative_prompt, ill?.negativePrompt]);

  let visualAnchorVisible: boolean;
  if (typeof ill?.visual_anchor_visible === 'boolean')
    visualAnchorVisible = ill.visual_anchor_visible;
  else if (typeof ill?.visualAnchorVisible === 'boolean')
    visualAnchorVisible = ill.visualAnchorVisible;
  else visualAnchorVisible = category !== 'mood';

  const charactersPresent: string[] = Array.isArray(ill?.characters_present)
    ? ill.characters_present
    : Array.isArray(ill?.charactersPresent)
      ? ill.charactersPresent
      : [];

  const hasExplicitSize = typeof ill?.width === 'number' && typeof ill?.height === 'number';
  const [derivedW, derivedH] = hasExplicitSize
    ? [ill.width, ill.height]
    : derivePixelSize(aspectRatio);

  return {
    id,
    beatRef,
    category,
    aspectRatio,
    composition,
    mood,
    illustrationPrompt,
    negativePrompt,
    visualAnchorVisible,
    charactersPresent,
    width: derivedW,
    height: derivedH,
    sceneDescription: typeof ill?.sceneDescription === 'string' ? ill.sceneDescription : undefined,
    keyElements: Array.isArray(ill?.keyElements) ? ill.keyElements : undefined,
  };
}

export function normalizeIllustrationPlan(raw: any): IllustrationPlan {
  const illustrationsRaw = Array.isArray(raw?.illustrations) ? raw.illustrations : [];
  return {
    styleGuide: raw?.styleGuide ?? raw?.style_guide ?? '',
    characterConsistencyNotes:
      raw?.characterConsistencyNotes ?? raw?.character_consistency_notes ?? '',
    illustrations: illustrationsRaw.map((ill: any, i: number) => normalizeIllustrationSpec(ill, i)),
    totalIllustrations:
      typeof raw?.total_illustrations === 'number'
        ? raw.total_illustrations
        : typeof raw?.totalIllustrations === 'number'
          ? raw.totalIllustrations
          : illustrationsRaw.length,
    characterDescriptionEn: raw?.character_description_en ?? raw?.characterDescriptionEn,
    guideDescriptionEn: raw?.guide_description_en ?? raw?.guideDescriptionEn,
    visualAnchor: raw?.visual_anchor ?? raw?.visualAnchor,
  };
}

/** Convert aspect ratio like "2:3" / "3:2" to a pixel size. Used by the image gen API. */
export function derivePixelSize(aspectRatio: string): [number, number] {
  // Base size ~900px long edge (Gemini image gen sweet spot)
  const longEdge = 900;
  const match = /^(\d+)\s*:\s*(\d+)$/.exec(aspectRatio.trim());
  if (!match) return [longEdge, longEdge];
  const w = parseInt(match[1], 10);
  const h = parseInt(match[2], 10);
  if (!w || !h) return [longEdge, longEdge];
  if (w >= h) {
    return [longEdge, Math.round((longEdge * h) / w)];
  }
  return [Math.round((longEdge * w) / h), longEdge];
}
