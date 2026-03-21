import { describe, it, expect } from 'vitest';
import { normalizePages, applyCorrections, normalizeParentCard } from '../../convex/lib/bookAgentUtils';
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

  it('extracts from story_text array of strings (trustee variant)', () => {
    const raw = {
      story_text: [
        'Był sobie mały chłopiec o imieniu Kuba.',
        'Kuba lubił bawić się w parku.',
        'Pewnego dnia spotkał nowego kolegę.',
      ],
    };
    const result = normalizePages(raw);
    expect(result).toHaveLength(3);
    expect(result[0].beatNumber).toBe(1);
    expect(result[0].text).toBe('Był sobie mały chłopiec o imieniu Kuba.');
    expect(result[2].beatNumber).toBe(3);
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

  it('prefers pages over scenes when both present', () => {
    const raw = {
      pages: [{ text: 'From pages', beatNumber: 1 }],
      scenes: [{ text_pl: 'From scenes', beat_number: 1 }],
    };
    const result = normalizePages(raw);
    expect(result[0].text).toBe('From pages');
  });

  it('handles scenes with text instead of text_pl', () => {
    const raw = {
      scenes: [
        { beat_number: 1, text: 'Scene text fallback' },
      ],
    };
    const result = normalizePages(raw);
    expect(result[0].text).toBe('Scene text fallback');
  });
});

describe('applyCorrections', () => {
  const baseDraft: StoryDraft = {
    title: 'Test',
    dedication: 'For kids',
    pages: [
      { beatNumber: 1, text: 'Kuba był bardzo smutny i płakał.', readAloudVersion: 'Kuba był bardzo smutny i płakał.' },
      { beatNumber: 2, text: 'Potwór był straszny i groził dzieciom.', readAloudVersion: 'Potwór był straszny i groził dzieciom.' },
      { beatNumber: 3, text: 'Kuba poczuł się lepiej i uśmiechnął się.', readAloudVersion: 'Kuba poczuł się lepiej i uśmiechnął się.' },
    ],
    wordCount: 100,
  };

  it('applies trustee-style find/replace when originalPl and correctedPl provided', () => {
    const review: PsychReview = {
      status: 'PASS_WITH_CORRECTIONS',
      overallAssessment: 'ok',
      ageAppropriateness: 5,
      therapeuticAlignment: 4,
      emotionalSafety: 5,
      corrections: [
        {
          page: 2,
          issue: 'too scary',
          suggestion: 'soften',
          severity: 'medium',
          originalPl: 'Potwór był straszny i groził dzieciom.',
          correctedPl: 'Potwór wyglądał groźnie, ale Kuba wiedział, że jest odważny.',
        },
      ],
    };

    const result = applyCorrections(baseDraft, review);

    expect(result.pages[1].text).toBe('Potwór wyglądał groźnie, ale Kuba wiedział, że jest odważny.');
    expect(result.pages[1].text).not.toContain('straszny');
    // readAloudVersion should also be updated
    expect(result.pages[1].readAloudVersion).toBe('Potwór wyglądał groźnie, ale Kuba wiedział, że jest odważny.');
    // Original should NOT be modified
    expect(baseDraft.pages[1].text).toBe('Potwór był straszny i groził dzieciom.');
  });

  it('falls back to smart replacement with legacy format', () => {
    const review: PsychReview = {
      status: 'PASS_WITH_CORRECTIONS',
      overallAssessment: 'ok',
      ageAppropriateness: 4,
      therapeuticAlignment: 4,
      emotionalSafety: 4,
      corrections: [
        {
          page: 2,
          issue: 'straszny language too intense',
          suggestion: 'Potwór nie był taki groźny.',
          severity: 'medium',
        },
      ],
    };

    const result = applyCorrections(baseDraft, review);
    // The sentence containing "straszny" should be replaced
    expect(result.pages[1].text).toContain('Potwór nie był taki groźny.');
    expect(result.pages[1].text).not.toContain('groził dzieciom');
  });

  it('does NOT append [Korekta:...] to text', () => {
    const review: PsychReview = {
      status: 'PASS_WITH_CORRECTIONS',
      overallAssessment: 'ok',
      ageAppropriateness: 5,
      therapeuticAlignment: 5,
      emotionalSafety: 5,
      corrections: [
        {
          page: 1,
          issue: 'too sad',
          suggestion: 'Use gentler wording',
          severity: 'low',
          originalPl: 'Kuba był bardzo smutny i płakał.',
          correctedPl: 'Kuba poczuł smutek, ale wiedział że to przejdzie.',
        },
      ],
    };

    const result = applyCorrections(baseDraft, review);
    expect(result.pages[0].text).not.toContain('[Korekta');
    expect(result.pages[0].text).toBe('Kuba poczuł smutek, ale wiedział że to przejdzie.');
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
    expect(result).toBe(baseDraft);
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
    for (let i = 0; i < result.pages.length; i++) {
      expect(result.pages[i].text).not.toContain('[Korekta');
    }
  });

  it('skips when originalPl not found in page text', () => {
    const review: PsychReview = {
      status: 'PASS_WITH_CORRECTIONS',
      overallAssessment: 'ok',
      ageAppropriateness: 4,
      therapeuticAlignment: 4,
      emotionalSafety: 4,
      corrections: [
        {
          page: 1,
          issue: 'test',
          suggestion: 'test',
          severity: 'low',
          originalPl: 'This text does not exist in the page',
          correctedPl: 'Replacement',
        },
      ],
    };

    const result = applyCorrections(baseDraft, review);
    // Page text should be unchanged
    expect(result.pages[0].text).toBe('Kuba był bardzo smutny i płakał.');
  });
});

describe('normalizeParentCard', () => {
  it('extracts parentCard from camelCase format', () => {
    const raw = {
      parentCard: {
        title: 'Drogi Rodzicu',
        introPl: 'Ta bajka opowiada o odwadze.',
        questions: ['Jak się czuł Kuba?', 'Co pomogło Kubie?', 'A ty?'],
        activityPl: 'Narysujcie razem obrazek.',
      },
    };
    const result = normalizeParentCard(raw);
    expect(result).toBeDefined();
    expect(result!.title).toBe('Drogi Rodzicu');
    expect(result!.questions).toHaveLength(3);
    expect(result!.activityPl).toBe('Narysujcie razem obrazek.');
  });

  it('extracts parentCard from snake_case format (trustee)', () => {
    const raw = {
      parent_card: {
        title: 'Drogi Rodzicu',
        intro_pl: 'Intro text',
        questions: ['Q1', 'Q2'],
        activity_pl: 'Draw together',
      },
    };
    const result = normalizeParentCard(raw);
    expect(result).toBeDefined();
    expect(result!.introPl).toBe('Intro text');
    expect(result!.activityPl).toBe('Draw together');
  });

  it('returns undefined when no parentCard present', () => {
    const result = normalizeParentCard({ title: 'Story', pages: [] });
    expect(result).toBeUndefined();
  });

  it('defaults title to "Drogi Rodzicu" when missing', () => {
    const raw = {
      parentCard: {
        introPl: 'Some intro',
        questions: [],
        activityPl: '',
      },
    };
    const result = normalizeParentCard(raw);
    expect(result!.title).toBe('Drogi Rodzicu');
  });
});
