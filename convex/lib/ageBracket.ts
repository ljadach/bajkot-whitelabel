/**
 * Age bracket helpers.
 *
 * The order form now collects a concrete age number (e.g. 4, 7, 10).
 * Downstream prompts still need the 3-bracket bucket ("3-5" | "6-8" | "9+")
 * because beat/illustration counts, word budgets, and page sequences are
 * all indexed by bracket.
 *
 * Legacy orders stored only `ageBracket`. New orders store both `ageBracket`
 * (derived) and optionally `ageNumber` (raw input). Read order of preference:
 *   1. ageNumber, if present → derive bracket
 *   2. ageBracket stored value (legacy)
 */

export type AgeBracket = '3-5' | '6-8' | '9+';

const MIN_AGE = 2;
const MAX_AGE = 16;

/** Map concrete age (years) to the bracket used throughout the pipeline.
 *  Spec section 3.4 mandates supporting ages 2-12; age 2 maps to the
 *  smallest bracket ('3-5'). */
export function toAgeBracket(age: number): AgeBracket {
  if (!Number.isFinite(age)) throw new Error(`Invalid age: ${age}`);
  if (age < MIN_AGE || age > MAX_AGE) {
    throw new Error(`Age out of range (${MIN_AGE}-${MAX_AGE}): ${age}`);
  }
  if (age <= 5) return '3-5';
  if (age <= 8) return '6-8';
  return '9+';
}

/** Resolve the bracket for an order that may or may not have a concrete ageNumber. */
export function resolveAgeBracket(order: {
  ageNumber?: number | null;
  ageBracket?: AgeBracket | string | null;
}): AgeBracket {
  if (order.ageNumber != null) return toAgeBracket(order.ageNumber);
  const b = order.ageBracket;
  if (b === '3-5' || b === '6-8' || b === '9+') return b;
  throw new Error(`Order has no resolvable age — ageNumber and ageBracket both missing`);
}

/** Representative age used for prompts that want a number (e.g. A1 age_look). */
export function bracketToRepresentativeAge(bracket: AgeBracket): number {
  switch (bracket) {
    case '3-5':
      return 4;
    case '6-8':
      return 7;
    case '9+':
      return 10;
  }
}

/** Expected counts per age bracket from the 2026-04-16 prompt refactor. */
export interface AgeBracketShape {
  beats: number;
  illustrations: number;
  pages: number;
  totalWordsApprox: number;
}

export function shapeFor(bracket: AgeBracket): AgeBracketShape {
  switch (bracket) {
    case '3-5':
      return { beats: 6, illustrations: 12, pages: 24, totalWordsApprox: 1730 };
    case '6-8':
      return { beats: 7, illustrations: 13, pages: 27, totalWordsApprox: 3500 };
    case '9+':
      return { beats: 8, illustrations: 15, pages: 31, totalWordsApprox: 4500 };
  }
}

/** Deterministic list of illustration IDs expected from A5 per bracket. */
export function expectedIllustrationIds(bracket: AgeBracket): string[] {
  switch (bracket) {
    case '3-5':
      return [
        'cover',
        'mood_opening',
        'scene_1.1',
        'scene_1.2',
        'scene_2',
        'scene_3',
        'scene_4.1',
        'scene_4.2',
        'scene_5.1',
        'scene_5.2',
        'scene_6',
        'mood_closing',
      ];
    case '6-8':
      return [
        'cover',
        'scene_1.1',
        'scene_1.2',
        'scene_2',
        'scene_3',
        'scene_4.1',
        'scene_4.2',
        'scene_4a.1',
        'scene_4a.2',
        'scene_5.1',
        'scene_5.2',
        'scene_6',
        'mood_closing',
      ];
    case '9+':
      return [
        'cover',
        'scene_1.1',
        'scene_1.2',
        'scene_2',
        'scene_3',
        'scene_4.1',
        'scene_4.2',
        'scene_4a.1',
        'scene_4a.2',
        'scene_4b.1',
        'scene_4b.2',
        'scene_5.1',
        'scene_5.2',
        'scene_6',
        'mood_closing',
      ];
  }
}

/** Deterministic list of beat IDs per bracket. */
export function expectedBeatIds(bracket: AgeBracket): string[] {
  switch (bracket) {
    case '3-5':
      return ['1', '2', '3', '4', '5', '6'];
    case '6-8':
      return ['1', '2', '3', '4', '4a', '5', '6'];
    case '9+':
      return ['1', '2', '3', '4', '4a', '4b', '5', '6'];
  }
}
