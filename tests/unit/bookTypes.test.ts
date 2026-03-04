import { describe, it, expect } from 'vitest';
import { parseArtifact } from '../../convex/lib/bookTypes';

describe('parseArtifact', () => {
  it('parses valid JSON and returns typed result', () => {
    const input = JSON.stringify({ title: 'hello', pages: [] });
    const result = parseArtifact<{ title: string; pages: unknown[] }>(input, 'storyDraft');
    expect(result.title).toBe('hello');
    expect(result.pages).toEqual([]);
  });

  it('throws on null with readable error', () => {
    expect(() => parseArtifact(null, 'storyDraft')).toThrow('Missing artifact: storyDraft');
  });

  it('throws on undefined with readable error', () => {
    expect(() => parseArtifact(undefined, 'characterProfile')).toThrow(
      'Missing artifact: characterProfile'
    );
  });

  it('throws on empty string with readable error', () => {
    expect(() => parseArtifact('', 'illustrationPlan')).toThrow(
      'Missing artifact: illustrationPlan'
    );
  });

  it('throws on corrupted JSON with label and parse error', () => {
    expect(() => parseArtifact('{broken', 'psychReview')).toThrow('Corrupted artifact psychReview');
  });
});
