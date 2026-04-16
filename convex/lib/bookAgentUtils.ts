/**
 * Pure utility functions extracted from bookAgents.ts for testability.
 */

import type { StoryDraft, PsychReview } from './bookTypes';
import { normalizePagesV2 } from './bookAgentUtilsV2';

/** Safety suffix appended to all image generation prompts to avoid harmful content */
export const IMAGE_SAFETY_SUFFIX =
  'Do not include: scary imagery, dark horror themes, realistic photography, deformed anatomy, extra fingers or limbs, blurry content, watermarks, text overlays, signatures, adult or violent content.';

/**
 * Normalize LLM output to StoryDraft.pages.
 * Delegates to V2 so new A3 beats-schema, legacy pages/scenes/story_text all work.
 */
export function normalizePages(raw: any): StoryDraft['pages'] {
  return normalizePagesV2(raw);
}

/**
 * Apply psych reviewer corrections to story draft.
 * Uses find/replace when originalPl+correctedPl are available (trustee parity),
 * falls back to appending the corrected text at the replacement point.
 */
export function applyCorrections(draft: StoryDraft, review: PsychReview): StoryDraft {
  if (!review.corrections || review.corrections.length === 0) return draft;
  if (!draft.pages || !Array.isArray(draft.pages)) return draft;

  const corrected: StoryDraft = JSON.parse(JSON.stringify(draft));

  for (const correction of review.corrections) {
    const page = corrected.pages.find((p) => p.beatNumber === correction.page);
    if (!page) continue;

    if (correction.originalPl && correction.correctedPl) {
      // Trustee-style: exact find/replace
      if (page.text.includes(correction.originalPl)) {
        page.text = page.text.replaceAll(correction.originalPl, correction.correctedPl);
        if (page.readAloudVersion.includes(correction.originalPl)) {
          page.readAloudVersion = page.readAloudVersion.replaceAll(
            correction.originalPl,
            correction.correctedPl,
          );
        }
      } else {
        // Original text not found — log and skip to avoid corrupting the draft
        console.warn(
          `[applyCorrections] Could not find original text for page ${correction.page}, skipping correction`,
        );
      }
    } else if (correction.issue && correction.suggestion) {
      // Legacy fallback: attempt smart replacement by searching for issue-related text
      // If the suggestion looks like replacement text (not a meta-comment), replace the first
      // sentence that contains a keyword from the issue
      const issueWords = correction.issue
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4);
      const sentences = page.text.split(/(?<=[.!?])\s+/);
      let replaced = false;

      for (let si = 0; si < sentences.length; si++) {
        const lower = sentences[si].toLowerCase();
        if (issueWords.some((w) => lower.includes(w))) {
          sentences[si] = correction.suggestion;
          page.text = sentences.join(' ');
          replaced = true;
          break;
        }
      }

      if (!replaced) {
        console.warn(
          `[applyCorrections] Could not locate issue text for page ${correction.page}, correction not applied`,
        );
      }
    }
  }

  return corrected;
}

/** Normalize parentCard from LLM output (handles snake_case and camelCase) */
export function normalizeParentCard(raw: any): StoryDraft['parentCard'] {
  const pc = raw.parentCard || raw.parent_card;
  if (!pc) return undefined;
  return {
    title: pc.title || 'Drogi Rodzicu',
    introPl: pc.introPl || pc.intro_pl || '',
    questions: pc.questions || [],
    activityPl: pc.activityPl || pc.activity_pl || '',
  };
}
