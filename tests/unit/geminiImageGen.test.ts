import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Save original fetch
const originalFetch = globalThis.fetch;

function makeSuccessResponse() {
  const imageBase64 = btoa('fake-png-data');
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { data: imageBase64, mimeType: 'image/png' } }],
          },
        },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

function make429Response() {
  return new Response('Rate limited', { status: 429 });
}

function make500Response() {
  return new Response('Server error', { status: 500 });
}

describe('generateImage', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'test-key');
    // Reset module cache so each test gets fresh lastCallTime
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  it('returns Uint8Array on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeSuccessResponse());

    const { generateImage } = await import('../../convex/lib/geminiImageGen');
    const promise = generateImage('test prompt');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result!.length).toBeGreaterThan(0);
  });

  it('retries on 429 then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(make429Response())
      .mockResolvedValueOnce(makeSuccessResponse());
    globalThis.fetch = fetchMock;

    const { generateImage } = await import('../../convex/lib/geminiImageGen');
    const promise = generateImage('test prompt');
    // Advance past rate limit wait + 429 retry wait
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeInstanceOf(Uint8Array);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns null after 3 failures', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => Promise.resolve(make500Response()));

    const { generateImage } = await import('../../convex/lib/geminiImageGen');
    const promise = generateImage('test prompt');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeNull();
  });

  it('returns null when API key is missing', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '');

    const { generateImage } = await import('../../convex/lib/geminiImageGen');
    const result = await generateImage('test prompt');

    expect(result).toBeNull();
  });
});
