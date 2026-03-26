/**
 * Validation for batch book order profiles.
 * Reuses maps from bookData.ts to verify keys.
 */

import {
  PROBLEMS,
  AGE_BRACKETS,
  HAIR_COLORS,
  HAIR_STYLES,
  EYE_COLORS,
  SKIN_TONES,
  OUTFITS,
} from './bookData';

export interface BatchProfile {
  childName: string;
  ageBracket: '3-5' | '6-8' | '9+';
  gender: 'boy' | 'girl';
  problemId: string;
  problemDetail?: string;
  favoriteToy?: string;
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  skinTone: string;
  outfit: string;
  glasses: boolean;
  email?: string;
  chosenStyle?: 'A' | 'B';
  skipQaReviews?: boolean;
}

export function validateBatchProfile(profile: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!profile || typeof profile !== 'object') {
    return { valid: false, errors: ['Profile must be an object'] };
  }

  const p = profile as Record<string, unknown>;

  // Required string fields
  if (
    typeof p.childName !== 'string' ||
    p.childName.trim().length < 2 ||
    p.childName.trim().length > 30
  ) {
    errors.push('childName: must be 2-30 characters');
  }

  if (!AGE_BRACKETS.includes(p.ageBracket as (typeof AGE_BRACKETS)[number])) {
    errors.push(`ageBracket: must be one of ${AGE_BRACKETS.join(', ')}`);
  }

  if (p.gender !== 'boy' && p.gender !== 'girl') {
    errors.push('gender: must be "boy" or "girl"');
  }

  if (typeof p.problemId !== 'string' || !(p.problemId in PROBLEMS)) {
    errors.push(`problemId: must be one of ${Object.keys(PROBLEMS).join(', ')}`);
  }

  if (typeof p.hairColor !== 'string' || !(p.hairColor in HAIR_COLORS)) {
    errors.push(`hairColor: must be one of ${Object.keys(HAIR_COLORS).join(', ')}`);
  }

  if (typeof p.hairStyle !== 'string' || !(p.hairStyle in HAIR_STYLES)) {
    errors.push(`hairStyle: must be one of ${Object.keys(HAIR_STYLES).join(', ')}`);
  }

  if (typeof p.eyeColor !== 'string' || !(p.eyeColor in EYE_COLORS)) {
    errors.push(`eyeColor: must be one of ${Object.keys(EYE_COLORS).join(', ')}`);
  }

  if (typeof p.skinTone !== 'string' || !(p.skinTone in SKIN_TONES)) {
    errors.push(`skinTone: must be one of ${Object.keys(SKIN_TONES).join(', ')}`);
  }

  if (typeof p.outfit !== 'string' || !(p.outfit in OUTFITS)) {
    errors.push(`outfit: must be one of ${Object.keys(OUTFITS).join(', ')}`);
  }

  if (typeof p.glasses !== 'boolean') {
    errors.push('glasses: must be a boolean');
  }

  // Optional fields
  if (
    p.problemDetail !== undefined &&
    (typeof p.problemDetail !== 'string' || p.problemDetail.length > 500)
  ) {
    errors.push('problemDetail: must be a string, max 500 characters');
  }

  if (
    p.favoriteToy !== undefined &&
    (typeof p.favoriteToy !== 'string' || p.favoriteToy.length > 100)
  ) {
    errors.push('favoriteToy: must be a string, max 100 characters');
  }

  if (p.email !== undefined && typeof p.email !== 'string') {
    errors.push('email: must be a string');
  }

  if (p.chosenStyle !== undefined && p.chosenStyle !== 'A' && p.chosenStyle !== 'B') {
    errors.push('chosenStyle: must be "A" or "B"');
  }

  return { valid: errors.length === 0, errors };
}

export function parseBatchJson(raw: string): { profiles: unknown[]; parseError: string | null } {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { profiles: [], parseError: 'JSON must be an array of profiles' };
    }
    return { profiles: parsed, parseError: null };
  } catch {
    return { profiles: [], parseError: 'Invalid JSON' };
  }
}
