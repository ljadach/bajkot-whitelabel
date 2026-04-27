import { describe, it, expect } from 'vitest';
import {
  toAgeBracket,
  resolveAgeBracket,
  bracketToRepresentativeAge,
  shapeFor,
  expectedIllustrationIds,
  expectedBeatIds,
} from '../../convex/lib/ageBracket';

describe('toAgeBracket', () => {
  it('maps 2, 3, 4, 5 to "3-5"', () => {
    expect(toAgeBracket(2)).toBe('3-5');
    expect(toAgeBracket(3)).toBe('3-5');
    expect(toAgeBracket(4)).toBe('3-5');
    expect(toAgeBracket(5)).toBe('3-5');
  });

  it('maps 6, 7, 8 to "6-8"', () => {
    expect(toAgeBracket(6)).toBe('6-8');
    expect(toAgeBracket(7)).toBe('6-8');
    expect(toAgeBracket(8)).toBe('6-8');
  });

  it('maps 9-16 to "9+"', () => {
    expect(toAgeBracket(9)).toBe('9+');
    expect(toAgeBracket(10)).toBe('9+');
    expect(toAgeBracket(16)).toBe('9+');
  });

  it('throws for out-of-range ages', () => {
    expect(() => toAgeBracket(1)).toThrow();
    expect(() => toAgeBracket(17)).toThrow();
    expect(() => toAgeBracket(NaN)).toThrow();
  });
});

describe('resolveAgeBracket', () => {
  it('prefers ageNumber when present', () => {
    expect(resolveAgeBracket({ ageNumber: 7, ageBracket: '3-5' })).toBe('6-8');
  });

  it('falls back to stored ageBracket', () => {
    expect(resolveAgeBracket({ ageBracket: '9+' })).toBe('9+');
    expect(resolveAgeBracket({ ageBracket: '6-8', ageNumber: null })).toBe('6-8');
  });

  it('throws when both missing', () => {
    expect(() => resolveAgeBracket({})).toThrow();
  });
});

describe('bracketToRepresentativeAge', () => {
  it('returns a number in-range for each bracket', () => {
    expect(bracketToRepresentativeAge('3-5')).toBe(4);
    expect(bracketToRepresentativeAge('6-8')).toBe(7);
    expect(bracketToRepresentativeAge('9+')).toBe(10);
  });
});

describe('shapeFor', () => {
  it('matches spec counts for each bracket', () => {
    expect(shapeFor('3-5')).toMatchObject({ beats: 6, illustrations: 12, pages: 24 });
    expect(shapeFor('6-8')).toMatchObject({ beats: 7, illustrations: 13, pages: 27 });
    expect(shapeFor('9+')).toMatchObject({ beats: 8, illustrations: 15, pages: 31 });
  });
});

describe('expectedIllustrationIds', () => {
  it('returns 12/13/15 IDs per bracket', () => {
    expect(expectedIllustrationIds('3-5')).toHaveLength(12);
    expect(expectedIllustrationIds('6-8')).toHaveLength(13);
    expect(expectedIllustrationIds('9+')).toHaveLength(15);
  });

  it('3-5 has mood_opening, 6+ does not', () => {
    expect(expectedIllustrationIds('3-5')).toContain('mood_opening');
    expect(expectedIllustrationIds('6-8')).not.toContain('mood_opening');
    expect(expectedIllustrationIds('9+')).not.toContain('mood_opening');
  });

  it('all brackets have mood_closing and cover', () => {
    for (const b of ['3-5', '6-8', '9+'] as const) {
      expect(expectedIllustrationIds(b)).toContain('mood_closing');
      expect(expectedIllustrationIds(b)[0]).toBe('cover');
    }
  });

  it('9+ is the only bracket with scene_4b.*', () => {
    expect(expectedIllustrationIds('9+')).toEqual(
      expect.arrayContaining(['scene_4b.1', 'scene_4b.2']),
    );
    expect(expectedIllustrationIds('6-8')).not.toContain('scene_4b.1');
    expect(expectedIllustrationIds('3-5')).not.toContain('scene_4b.1');
  });

  it('6-8 has scene_4a.* but not scene_4b.*', () => {
    const ids = expectedIllustrationIds('6-8');
    expect(ids).toContain('scene_4a.1');
    expect(ids).toContain('scene_4a.2');
    expect(ids).not.toContain('scene_4b.1');
  });

  it('3-5 has neither 4a nor 4b variants', () => {
    const ids = expectedIllustrationIds('3-5');
    expect(ids.every((id) => !id.startsWith('scene_4a') && !id.startsWith('scene_4b'))).toBe(true);
  });
});

describe('expectedBeatIds', () => {
  it('returns 6/7/8 beats respectively with correct 4a/4b presence', () => {
    expect(expectedBeatIds('3-5')).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(expectedBeatIds('6-8')).toEqual(['1', '2', '3', '4', '4a', '5', '6']);
    expect(expectedBeatIds('9+')).toEqual(['1', '2', '3', '4', '4a', '4b', '5', '6']);
  });
});
