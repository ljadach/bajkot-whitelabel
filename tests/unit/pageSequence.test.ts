import { describe, it, expect } from 'vitest';
import { buildPageSequence, splitBeatText } from '../../convex/lib/pageSequence';

describe('buildPageSequence', () => {
  it('3-5 produces 24 pages with mood_opening', () => {
    const pages = buildPageSequence('3-5');
    expect(pages).toHaveLength(24);
    expect(pages[0].kind).toBe('cover');
    expect(pages[1].kind).toBe('title');
    expect(pages[2].kind).toBe('mood_opening');
    expect(pages[2].illustrationId).toBe('mood_opening');
    // Last three pages
    expect(pages[21].kind).toBe('mood_closing');
    expect(pages[22].kind).toBe('parent_card');
    expect(pages[23].kind).toBe('colophon');
  });

  it('6-8 produces 27 pages without mood_opening', () => {
    const pages = buildPageSequence('6-8');
    expect(pages).toHaveLength(27);
    expect(pages.find((p) => p.kind === 'mood_opening')).toBeUndefined();
    expect(pages.find((p) => p.kind === 'mood_closing')).toBeDefined();
  });

  it('9+ produces 31 pages and includes beat 4b split across two text pages', () => {
    const pages = buildPageSequence('9+');
    expect(pages).toHaveLength(31);
    const beat4bTexts = pages.filter((p) => p.kind === 'text' && p.beatId === '4b');
    expect(beat4bTexts).toHaveLength(2);
    expect(beat4bTexts[0].textPart).toBe(1);
    expect(beat4bTexts[1].textPart).toBe(2);
  });

  it('each double-illustration beat has two illustration pages with .1/.2 ids', () => {
    const pages = buildPageSequence('9+');
    const illOf = (id: string) => pages.find((p) => p.illustrationId === id);
    expect(illOf('scene_1.1')).toBeDefined();
    expect(illOf('scene_1.2')).toBeDefined();
    expect(illOf('scene_4.1')).toBeDefined();
    expect(illOf('scene_4.2')).toBeDefined();
    expect(illOf('scene_4a.1')).toBeDefined();
    expect(illOf('scene_4a.2')).toBeDefined();
    expect(illOf('scene_4b.1')).toBeDefined();
    expect(illOf('scene_4b.2')).toBeDefined();
    expect(illOf('scene_5.1')).toBeDefined();
    expect(illOf('scene_5.2')).toBeDefined();
  });

  it('single-illustration beats (2, 3, 6) have exactly one illustration page', () => {
    const pages = buildPageSequence('6-8');
    for (const id of ['scene_2', 'scene_3', 'scene_6']) {
      expect(pages.filter((p) => p.illustrationId === id)).toHaveLength(1);
    }
  });

  it('text pages immediately follow their illustration page', () => {
    for (const bracket of ['3-5', '6-8', '9+'] as const) {
      const pages = buildPageSequence(bracket);
      for (let i = 0; i < pages.length - 1; i++) {
        if (pages[i].kind === 'illustration') {
          // For mood illustrations this isn't strictly enforced, but scene illustrations
          // in the core beat loop should be followed by a text page.
          const id = pages[i].illustrationId!;
          if (id.startsWith('scene_')) {
            expect(pages[i + 1].kind).toBe('text');
          }
        }
      }
    }
  });

  it('page numbers are 1-indexed and contiguous', () => {
    for (const bracket of ['3-5', '6-8', '9+'] as const) {
      const pages = buildPageSequence(bracket);
      pages.forEach((p, i) => expect(p.pageNumber).toBe(i + 1));
    }
  });
});

describe('splitBeatText', () => {
  it('splits on nearest paragraph break', () => {
    const text = 'One paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const [a, b] = splitBeatText(text);
    expect(a).toContain('One paragraph.');
    expect(b).toContain('Third paragraph.');
    expect(a + '\n\n' + b).toContain('Second paragraph.');
  });

  it('falls back to sentence split when only one paragraph', () => {
    const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
    const [a, b] = splitBeatText(text);
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
    expect(a + ' ' + b).toContain('Fourth sentence.');
  });

  it('word-splits a single long sentence', () => {
    const text = 'one two three four five six seven eight nine ten';
    const [a, b] = splitBeatText(text);
    expect(a.split(/\s+/)).toHaveLength(5);
    expect(b.split(/\s+/)).toHaveLength(5);
  });

  it('returns ["", ""] for empty input', () => {
    expect(splitBeatText('')).toEqual(['', '']);
    expect(splitBeatText('   ')).toEqual(['', '']);
  });

  it('handles single-word input by keeping it in the first half', () => {
    const [a, b] = splitBeatText('hello');
    expect(a).toBe('hello');
    expect(b).toBe('');
  });
});
