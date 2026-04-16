/**
 * A9 Composer — deterministic page sequence per age bracket (2026-04-16 spec).
 *
 * Each age bracket produces a FIXED sequence of PDF pages. Some pages are
 * illustrations (full-bleed), some are text (prose from a beat), and some
 * are structural (cover, title, parent card, colophon).
 *
 * Beats with two illustrations (.1/.2) split their `text_pl` across two text
 * pages at a natural paragraph break near the midpoint. Single-illustration
 * beats (B2, B3, B6) get one text page.
 */

import type { AgeBracket } from './ageBracket';

export type PageKind =
  | 'cover'
  | 'title'
  | 'mood_opening'
  | 'mood_closing'
  | 'illustration'
  | 'text'
  | 'parent_card'
  | 'colophon';

export interface PageSpec {
  pageNumber: number; // 1-indexed
  kind: PageKind;
  illustrationId?: string; // for kind=illustration/mood_opening/mood_closing/cover
  beatId?: string; // for kind=text
  textPart?: 1 | 2; // when a beat is split across two text pages
}

interface BeatLayout {
  beatId: string;
  illustrationIds: string[]; // 1 or 2 ids, in order
}

/** Per-bracket beat→illustration mapping (derived from A5 spec). */
function beatLayout(bracket: AgeBracket): BeatLayout[] {
  switch (bracket) {
    case '3-5':
      return [
        { beatId: '1', illustrationIds: ['scene_1.1', 'scene_1.2'] },
        { beatId: '2', illustrationIds: ['scene_2'] },
        { beatId: '3', illustrationIds: ['scene_3'] },
        { beatId: '4', illustrationIds: ['scene_4.1', 'scene_4.2'] },
        { beatId: '5', illustrationIds: ['scene_5.1', 'scene_5.2'] },
        { beatId: '6', illustrationIds: ['scene_6'] },
      ];
    case '6-8':
      return [
        { beatId: '1', illustrationIds: ['scene_1.1', 'scene_1.2'] },
        { beatId: '2', illustrationIds: ['scene_2'] },
        { beatId: '3', illustrationIds: ['scene_3'] },
        { beatId: '4', illustrationIds: ['scene_4.1', 'scene_4.2'] },
        { beatId: '4a', illustrationIds: ['scene_4a.1', 'scene_4a.2'] },
        { beatId: '5', illustrationIds: ['scene_5.1', 'scene_5.2'] },
        { beatId: '6', illustrationIds: ['scene_6'] },
      ];
    case '9+':
      return [
        { beatId: '1', illustrationIds: ['scene_1.1', 'scene_1.2'] },
        { beatId: '2', illustrationIds: ['scene_2'] },
        { beatId: '3', illustrationIds: ['scene_3'] },
        { beatId: '4', illustrationIds: ['scene_4.1', 'scene_4.2'] },
        { beatId: '4a', illustrationIds: ['scene_4a.1', 'scene_4a.2'] },
        { beatId: '4b', illustrationIds: ['scene_4b.1', 'scene_4b.2'] },
        { beatId: '5', illustrationIds: ['scene_5.1', 'scene_5.2'] },
        { beatId: '6', illustrationIds: ['scene_6'] },
      ];
  }
}

/**
 * Build the full deterministic page sequence for the given bracket.
 * Page counts match the spec: 24 (3-5), 27 (6-8), 31 (9+).
 */
export function buildPageSequence(bracket: AgeBracket): PageSpec[] {
  const pages: Omit<PageSpec, 'pageNumber'>[] = [];

  pages.push({ kind: 'cover', illustrationId: 'cover' });
  pages.push({ kind: 'title' });
  if (bracket === '3-5') {
    pages.push({ kind: 'mood_opening', illustrationId: 'mood_opening' });
  }

  for (const beat of beatLayout(bracket)) {
    if (beat.illustrationIds.length === 1) {
      pages.push({ kind: 'illustration', illustrationId: beat.illustrationIds[0] });
      pages.push({ kind: 'text', beatId: beat.beatId });
    } else {
      pages.push({ kind: 'illustration', illustrationId: beat.illustrationIds[0] });
      pages.push({ kind: 'text', beatId: beat.beatId, textPart: 1 });
      pages.push({ kind: 'illustration', illustrationId: beat.illustrationIds[1] });
      pages.push({ kind: 'text', beatId: beat.beatId, textPart: 2 });
    }
  }

  pages.push({ kind: 'mood_closing', illustrationId: 'mood_closing' });
  pages.push({ kind: 'parent_card' });
  pages.push({ kind: 'colophon' });

  return pages.map((p, i) => ({ pageNumber: i + 1, ...p }));
}

/**
 * Split a beat's prose into two roughly-balanced halves for .1/.2 layout.
 * Prefers a natural paragraph break near the midpoint. Falls back to a
 * sentence-level split, and finally to a word-count split if all else fails.
 */
export function splitBeatText(text: string): [string, string] {
  const trimmed = text.trim();
  if (!trimmed) return ['', ''];

  // Try paragraph split (double newline) closest to midpoint
  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length >= 2) {
    const totalLen = paragraphs.reduce((sum, p) => sum + p.length, 0);
    let acc = 0;
    let bestIdx = 1;
    let bestDelta = Infinity;
    for (let i = 1; i < paragraphs.length; i++) {
      acc += paragraphs[i - 1].length;
      const delta = Math.abs(acc - totalLen / 2);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIdx = i;
      }
    }
    return [paragraphs.slice(0, bestIdx).join('\n\n'), paragraphs.slice(bestIdx).join('\n\n')];
  }

  // Sentence split
  const sentences = trimmed.match(/[^.!?]+[.!?]+\s*/g);
  if (sentences && sentences.length >= 2) {
    const totalLen = trimmed.length;
    let acc = 0;
    let splitIdx = Math.ceil(sentences.length / 2);
    for (let i = 1; i < sentences.length; i++) {
      acc += sentences[i - 1].length;
      if (acc >= totalLen / 2) {
        splitIdx = i;
        break;
      }
    }
    return [
      sentences.slice(0, splitIdx).join('').trim(),
      sentences.slice(splitIdx).join('').trim(),
    ];
  }

  // Word-count split (last resort — single sentence, single paragraph)
  const words = trimmed.split(/\s+/);
  if (words.length < 2) return [trimmed, ''];
  const mid = Math.floor(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}
