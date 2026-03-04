import { describe, it, expect } from 'vitest';
import { normalizePages, applyCorrections } from '../../convex/lib/bookAgentUtils';
import type { StoryDraft, PsychReview } from '../../convex/lib/bookTypes';

describe('normalizePages', () => {
  it('extracts from pages format', () => {
    const raw = {
      pages: [
        { beatNumber: 1, text: 'Hello', readAloudVersion: 'Hi' },
        { beatNumber: 2, text: 'World', readAloudVersion: 'World' },
      ],
    };
    const result = normalizePages(raw);
    expect(result).toHaveLength(2);
    expect(result[0].beatNumber).toBe(1);
    expect(result[0].text).toBe('Hello');
    expect(result[1].readAloudVersion).toBe('World');
  });

  it('extracts from scenes format', () => {
    const raw = {
      scenes: [
        { beat_number: 1, text_pl: 'Scena 1' },
        { beat_number: 2, text_pl: 'Scena 2' },
      ],
    };
    const result = normalizePages(raw);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Scena 1');
    expect(result[0].beatNumber).toBe(1);
  });

  it('extracts from beats format', () => {
    const raw = {
      beats: [
        { beatNumber: 1, text: 'Beat one' },
        { beatNumber: 2, text: 'Beat two' },
      ],
    };
    const result = normalizePages(raw);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Beat one');
  });

  it('returns empty array for unknown format', () => {
    const result = normalizePages({ chapters: [{ content: 'X' }] });
    expect(result).toEqual([]);
  });

  it('uses index-based beatNumber when field missing', () => {
    const raw = {
      pages: [{ text: 'No beat number' }, { text: 'Second page' }],
    };
    const result = normalizePages(raw);
    expect(result[0].beatNumber).toBe(1);
    expect(result[1].beatNumber).toBe(2);
  });
});

describe('applyCorrections', () => {
  const baseDraft: StoryDraft = {
    title: 'Test',
    dedication: 'For kids',
    pages: [
      { beatNumber: 1, text: 'Page one text', readAloudVersion: 'Page one' },
      { beatNumber: 2, text: 'Page two text', readAloudVersion: 'Page two' },
      { beatNumber: 3, text: 'Page three text', readAloudVersion: 'Page three' },
    ],
    wordCount: 100,
  };

  it('applies corrections to matching pages', () => {
    const review: PsychReview = {
      status: 'PASS_WITH_CORRECTIONS',
      overallAssessment: 'ok',
      ageAppropriateness: 5,
      therapeuticAlignment: 4,
      emotionalSafety: 5,
      corrections: [
        { page: 2, issue: 'too scary', suggestion: 'soften the language', severity: 'medium' },
      ],
    };

    const result = applyCorrections(baseDraft, review);

    expect(result.pages[1].text).toContain('[Korekta: soften the language]');
    // Original should NOT be modified
    expect(baseDraft.pages[1].text).toBe('Page two text');
  });

  it('returns original draft when no corrections', () => {
    const review: PsychReview = {
      status: 'PASS',
      overallAssessment: 'perfect',
      ageAppropriateness: 5,
      therapeuticAlignment: 5,
      emotionalSafety: 5,
      corrections: [],
    };

    const result = applyCorrections(baseDraft, review);
    expect(result).toBe(baseDraft); // same reference when no corrections
  });

  it('skips corrections for non-existent page numbers', () => {
    const review: PsychReview = {
      status: 'PASS_WITH_CORRECTIONS',
      overallAssessment: 'ok',
      ageAppropriateness: 4,
      therapeuticAlignment: 4,
      emotionalSafety: 4,
      corrections: [
        { page: 99, issue: 'phantom page', suggestion: 'fix it', severity: 'low' },
      ],
    };

    const result = applyCorrections(baseDraft, review);
    // No page modified
    for (let i = 0; i < result.pages.length; i++) {
      expect(result.pages[i].text).not.toContain('[Korekta');
    }
  });
});
