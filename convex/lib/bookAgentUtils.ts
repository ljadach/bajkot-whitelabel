/**
 * Pure utility functions extracted from bookAgents.ts for testability.
 */

import type { StoryDraft, PsychReview } from './bookTypes';

/** Normalize LLM output to consistent StoryDraft.pages format */
export function normalizePages(raw: any): StoryDraft['pages'] {
  // Try pages array first
  if (Array.isArray(raw.pages) && raw.pages[0]?.text) {
    return raw.pages.map((p: any, i: number) => ({
      beatNumber: p.beatNumber || p.beat_number || i + 1,
      text: p.text || p.text_pl || '',
      readAloudVersion: p.readAloudVersion || p.text || '',
    }));
  }
  // Try scenes array (trustee format)
  if (Array.isArray(raw.scenes)) {
    return raw.scenes.map((s: any, i: number) => ({
      beatNumber: s.beat_number || s.beatNumber || i + 1,
      text: s.text_pl || s.text || '',
      readAloudVersion: s.text_pl || s.text || '',
    }));
  }
  // Try beats array
  if (Array.isArray(raw.beats)) {
    return raw.beats.map((b: any, i: number) => ({
      beatNumber: b.beat_number || b.beatNumber || i + 1,
      text: b.text_pl || b.text || '',
      readAloudVersion: b.text_pl || b.text || '',
    }));
  }
  console.warn('[normalizePages] Could not find pages/scenes in LLM response. Keys:', Object.keys(raw));
  return [];
}

/** Apply psych reviewer corrections to story draft */
export function applyCorrections(draft: StoryDraft, review: PsychReview): StoryDraft {
  if (!review.corrections || review.corrections.length === 0) return draft;
  if (!draft.pages || !Array.isArray(draft.pages)) return draft;

  const corrected: StoryDraft = JSON.parse(JSON.stringify(draft));

  for (const correction of review.corrections) {
    const page = corrected.pages.find((p) => p.beatNumber === correction.page);
    if (page && correction.issue && correction.suggestion) {
      page.text = page.text + `\n\n[Korekta: ${correction.suggestion}]`;
    }
  }

  return corrected;
}
