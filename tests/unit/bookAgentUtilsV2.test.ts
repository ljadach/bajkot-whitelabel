import { describe, it, expect } from 'vitest';
import {
  normalizePagesV2,
  normalizeStoryDraftV2,
  normalizeIllustrationPlan,
  normalizeIllustrationSpec,
  derivePixelSize,
} from '../../convex/lib/bookAgentUtilsV2';

describe('normalizePagesV2 — new schema', () => {
  it('extracts beats[] with beat_id + text_pl + word_count', () => {
    const raw = {
      beats: [
        { beat_id: '1', text_pl: 'Paragraph one.', word_count: 3 },
        { beat_id: '4a', text_pl: 'Paragraph 4a.', word_count: 3 },
        { beat_id: '4b', text_pl: 'Paragraph 4b.', word_count: 3 },
      ],
    };
    const pages = normalizePagesV2(raw);
    expect(pages).toHaveLength(3);
    expect(pages[0].beatId).toBe('1');
    expect(pages[1].beatId).toBe('4a');
    expect(pages[2].beatId).toBe('4b');
    expect(pages[0].text).toBe('Paragraph one.');
    expect(pages[0].wordCount).toBe(3);
    // readAloudVersion defaults to text when not provided
    expect(pages[0].readAloudVersion).toBe('Paragraph one.');
  });

  it('assigns beatNumber by index when beat_id is string-only', () => {
    const raw = {
      beats: [
        { beat_id: '1', text_pl: 'x' },
        { beat_id: '4a', text_pl: 'y' },
      ],
    };
    const pages = normalizePagesV2(raw);
    expect(pages[0].beatNumber).toBe(1);
    expect(pages[1].beatNumber).toBe(2);
  });
});

describe('normalizePagesV2 — legacy fallback', () => {
  it('still extracts from pages[]', () => {
    const raw = { pages: [{ beatNumber: 1, text: 'Hello', readAloudVersion: 'Hi' }] };
    const pages = normalizePagesV2(raw);
    expect(pages).toHaveLength(1);
    expect(pages[0].text).toBe('Hello');
    expect(pages[0].readAloudVersion).toBe('Hi');
  });

  it('still extracts from scenes[]', () => {
    const raw = { scenes: [{ beat_number: 2, text_pl: 'Scena 2' }] };
    const pages = normalizePagesV2(raw);
    expect(pages[0].beatNumber).toBe(2);
    expect(pages[0].text).toBe('Scena 2');
  });

  it('still extracts from story_text[]', () => {
    const raw = { story_text: ['one', 'two', 'three'] };
    const pages = normalizePagesV2(raw);
    expect(pages).toHaveLength(3);
    expect(pages[0].text).toBe('one');
    expect(pages[2].beatNumber).toBe(3);
  });

  it('returns [] for unknown shapes', () => {
    expect(normalizePagesV2({})).toEqual([]);
    expect(normalizePagesV2(null)).toEqual([]);
    expect(normalizePagesV2({ chapters: [] })).toEqual([]);
  });

  it('prefers beats[] over pages[] when both present', () => {
    const raw = {
      beats: [{ beat_id: '1', text_pl: 'From beats' }],
      pages: [{ beatNumber: 1, text: 'From pages' }],
    };
    const pages = normalizePagesV2(raw);
    expect(pages[0].text).toBe('From beats');
  });
});

describe('normalizeStoryDraftV2', () => {
  it('replaces [name] placeholders with actual child name', () => {
    const raw = {
      title: 'Bajka dla [name]',
      dedication: 'Dla [name] z miłością',
      beats: [{ beat_id: '1', text_pl: 'intro' }],
    };
    const draft = normalizeStoryDraftV2(raw, 'Zosia');
    expect(draft.title).toBe('Bajka dla Zosia');
    expect(draft.dedication).toBe('Dla Zosia z miłością');
  });

  it('allows empty dedication (new schema: parent enters via UI)', () => {
    const raw = { beats: [{ beat_id: '1', text_pl: 'text' }] };
    const draft = normalizeStoryDraftV2(raw, 'Kuba');
    expect(draft.dedication).toBe('');
    expect(draft.pages).toHaveLength(1);
  });

  it('sums word_count from beats when top-level wordCount missing', () => {
    const raw = {
      beats: [
        { beat_id: '1', text_pl: 'a', word_count: 10 },
        { beat_id: '2', text_pl: 'b', word_count: 20 },
      ],
    };
    const draft = normalizeStoryDraftV2(raw, 'x');
    expect(draft.wordCount).toBe(30);
  });
});

describe('normalizeIllustrationSpec — new schema', () => {
  it('preserves id, composition, mood, negative_prompt, characters_present', () => {
    const ill = {
      id: 'scene_4a.2',
      beat_ref: '4a',
      category: 'scene',
      aspect_ratio: '3:2',
      composition: 'Wide shot, low angle',
      mood: 'Warm amber rim light',
      illustration_prompt: 'Child looking at shadow...',
      negative_prompt: 'scary, dark, horror, blurry',
      visual_anchor_visible: true,
      characters_present: ['child', 'guide'],
    };
    const spec = normalizeIllustrationSpec(ill, 5);
    expect(spec.id).toBe('scene_4a.2');
    expect(spec.beatRef).toBe('4a');
    expect(spec.category).toBe('scene');
    expect(spec.aspectRatio).toBe('3:2');
    expect(spec.composition).toBe('Wide shot, low angle');
    expect(spec.mood).toBe('Warm amber rim light');
    expect(spec.illustrationPrompt).toBe('Child looking at shadow...');
    expect(spec.negativePrompt).toBe('scary, dark, horror, blurry');
    expect(spec.visualAnchorVisible).toBe(true);
    expect(spec.charactersPresent).toEqual(['child', 'guide']);
  });

  it('keeps beat_ref null for cover/mood illustrations', () => {
    expect(normalizeIllustrationSpec({ id: 'cover', beat_ref: null, category: 'cover' }, 0).beatRef).toBeNull();
    expect(
      normalizeIllustrationSpec({ id: 'mood_closing', beat_ref: null, category: 'mood' }, 11).beatRef,
    ).toBeNull();
  });

  it('infers category from id when missing', () => {
    expect(normalizeIllustrationSpec({ id: 'cover' }, 0).category).toBe('cover');
    expect(normalizeIllustrationSpec({ id: 'scene_1.1' }, 2).category).toBe('scene');
    expect(normalizeIllustrationSpec({ id: 'mood_opening' }, 1).category).toBe('mood');
  });

  it('maps legacy snake/camel fields to new structure', () => {
    const legacy = {
      illustrationId: 'scene_1',
      beatRef: 1,
      sceneDescription: 'Child in bedroom',
      prompt: 'Legacy prompt',
      mood: 'Calm',
      keyElements: ['bed', 'window'],
      width: 900,
      height: 600,
    };
    const spec = normalizeIllustrationSpec(legacy, 2);
    expect(spec.id).toBe('scene_1');
    // beatRef is normalized to string — beat ids like '4a'/'4b' aren't numeric
    expect(spec.beatRef).toBe('1');
    expect(spec.illustrationPrompt).toBe('Legacy prompt');
    expect(spec.composition).toBe('Child in bedroom'); // falls back from sceneDescription
    expect(spec.negativePrompt).toBe(''); // legacy had no negative
  });

  it('derives dimensions from aspect_ratio', () => {
    const coverSpec = normalizeIllustrationSpec({ id: 'cover', aspect_ratio: '2:3' }, 0);
    expect(coverSpec.width).toBeGreaterThan(0);
    expect(coverSpec.height).toBeGreaterThan(coverSpec.width!);
    const sceneSpec = normalizeIllustrationSpec({ id: 'scene_1.1', aspect_ratio: '3:2' }, 1);
    expect(sceneSpec.width).toBeGreaterThan(sceneSpec.height!);
  });
});

describe('normalizeIllustrationPlan', () => {
  it('extracts all 12 illustrations for age 3-5', () => {
    const raw = {
      total_illustrations: 12,
      visual_anchor: 'yellow dinosaur hoodie',
      illustrations: [
        { id: 'cover', beat_ref: null, category: 'cover' },
        { id: 'mood_opening', beat_ref: null, category: 'mood' },
        { id: 'scene_1.1', beat_ref: '1', category: 'scene' },
        { id: 'scene_1.2', beat_ref: '1', category: 'scene' },
        { id: 'scene_2', beat_ref: '2', category: 'scene' },
        { id: 'scene_3', beat_ref: '3', category: 'scene' },
        { id: 'scene_4.1', beat_ref: '4', category: 'scene' },
        { id: 'scene_4.2', beat_ref: '4', category: 'scene' },
        { id: 'scene_5.1', beat_ref: '5', category: 'scene' },
        { id: 'scene_5.2', beat_ref: '5', category: 'scene' },
        { id: 'scene_6', beat_ref: '6', category: 'scene' },
        { id: 'mood_closing', beat_ref: null, category: 'mood' },
      ],
    };
    const plan = normalizeIllustrationPlan(raw);
    expect(plan.illustrations).toHaveLength(12);
    expect(plan.totalIllustrations).toBe(12);
    expect(plan.visualAnchor).toBe('yellow dinosaur hoodie');
  });

  it('tolerates camelCase top-level fields', () => {
    const plan = normalizeIllustrationPlan({
      totalIllustrations: 3,
      visualAnchor: 'x',
      illustrations: [],
    });
    expect(plan.totalIllustrations).toBe(3);
    expect(plan.visualAnchor).toBe('x');
  });
});

describe('derivePixelSize', () => {
  it('produces landscape dims for 3:2', () => {
    const [w, h] = derivePixelSize('3:2');
    expect(w).toBeGreaterThan(h);
    expect(w / h).toBeCloseTo(1.5, 1);
  });

  it('produces portrait dims for 2:3', () => {
    const [w, h] = derivePixelSize('2:3');
    expect(h).toBeGreaterThan(w);
    expect(h / w).toBeCloseTo(1.5, 1);
  });

  it('returns square for bogus strings', () => {
    const [w, h] = derivePixelSize('nonsense');
    expect(w).toBe(h);
  });
});
