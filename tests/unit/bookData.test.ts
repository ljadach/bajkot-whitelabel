import { describe, it, expect } from 'vitest';
import {
  PROBLEMS,
  PROBLEM_CATEGORIES,
  AGE_BRACKETS,
  PIPELINE_STEPS,
  HAIR_COLORS,
  HAIR_STYLES,
  EYE_COLORS,
  SKIN_TONES,
  OUTFITS,
} from '@lib/bookData';
import {
  HAIR_COLOR_MAP,
  HAIR_STYLE_MAP,
  EYE_COLOR_MAP,
  SKIN_TONE_MAP,
  OUTFIT_MAP,
} from '../../convex/lib/bookData';

describe('bookData — problem catalog', () => {
  it('every PROBLEM has title_pl and category', () => {
    for (const [id, p] of Object.entries(PROBLEMS)) {
      expect(p.title_pl, `${id} missing title_pl`).toBeTruthy();
      expect(p.category, `${id} missing category`).toBeTruthy();
    }
  });

  it('every PROBLEM category exists in PROBLEM_CATEGORIES', () => {
    const validCategories = Object.keys(PROBLEM_CATEGORIES);
    for (const [id, p] of Object.entries(PROBLEMS)) {
      expect(validCategories, `${id} has unknown category '${p.category}'`).toContain(p.category);
    }
  });

  it('AGE_BRACKETS contains exactly 3-5, 6-8, 9+', () => {
    expect([...AGE_BRACKETS]).toEqual(['3-5', '6-8', '9+']);
  });

  it('PIPELINE_STEPS covers 14 steps (intake → completed)', () => {
    expect(PIPELINE_STEPS).toHaveLength(14);
    expect(PIPELINE_STEPS[0].status).toBe('intake');
    expect(PIPELINE_STEPS[PIPELINE_STEPS.length - 1].status).toBe('completed');
  });
});

describe('bookData — frontend ↔ backend key parity', () => {
  it('HAIR_COLORS keys match HAIR_COLOR_MAP keys', () => {
    const frontendKeys = Object.keys(HAIR_COLORS).sort();
    const backendKeys = Object.keys(HAIR_COLOR_MAP).sort();
    expect(frontendKeys).toEqual(backendKeys);
  });

  it('HAIR_STYLES keys match HAIR_STYLE_MAP keys', () => {
    const frontendKeys = Object.keys(HAIR_STYLES).sort();
    const backendKeys = Object.keys(HAIR_STYLE_MAP).sort();
    expect(frontendKeys).toEqual(backendKeys);
  });

  it('EYE_COLORS keys match EYE_COLOR_MAP keys', () => {
    const frontendKeys = Object.keys(EYE_COLORS).sort();
    const backendKeys = Object.keys(EYE_COLOR_MAP).sort();
    expect(frontendKeys).toEqual(backendKeys);
  });

  it('SKIN_TONES keys match SKIN_TONE_MAP keys', () => {
    const frontendKeys = Object.keys(SKIN_TONES).sort();
    const backendKeys = Object.keys(SKIN_TONE_MAP).sort();
    expect(frontendKeys).toEqual(backendKeys);
  });

  it('OUTFITS keys match OUTFIT_MAP keys', () => {
    const frontendKeys = Object.keys(OUTFITS).sort();
    const backendKeys = Object.keys(OUTFIT_MAP).sort();
    expect(frontendKeys).toEqual(backendKeys);
  });

  it('every OUTFIT_MAP entry has pl and en', () => {
    for (const [key, outfit] of Object.entries(OUTFIT_MAP)) {
      expect(outfit.pl, `${key} missing pl`).toBeTruthy();
      expect(outfit.en, `${key} missing en`).toBeTruthy();
    }
  });
});
