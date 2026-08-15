/**
 * Meta pixel unit tests.
 *
 * The two properties worth defending here are the ones whose failure is
 * silent and expensive: a purchase counted twice because the browser and
 * server disagreed on the dedup key, and an event sent for someone who
 * rejected the cookie banner. Both would look fine in the UI and be wrong
 * in Meta.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  metaPurchaseEventId,
  getMetaMatchParams,
  buildMetaOrderAttribution,
} from '@lib/metaPixel';

// The server derives the same id from the same order id. Copied literally
// from convex/metaCapi.ts rather than imported: importing would make the
// test pass by construction even if one side later drifted, which is the
// exact failure this test exists to catch.
function serverSideEventId(orderId: string): string {
  return `purchase_${orderId}`;
}

describe('metaPurchaseEventId', () => {
  it('matches the server-side formula for the same order', () => {
    const orderId = 'k17abc123def456';
    expect(metaPurchaseEventId(orderId)).toBe(serverSideEventId(orderId));
  });

  it('is deterministic across calls — no timestamp, no randomness', () => {
    expect(metaPurchaseEventId('order-1')).toBe(metaPurchaseEventId('order-1'));
  });

  it('separates different orders', () => {
    expect(metaPurchaseEventId('order-1')).not.toBe(metaPurchaseEventId('order-2'));
  });
});

describe('getMetaMatchParams', () => {
  beforeEach(() => {
    // jsdom is not configured for this suite; stub the two globals used.
    vi.stubGlobal('document', { cookie: '' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads _fbp and _fbc from cookies when present', () => {
    vi.stubGlobal('document', {
      cookie: '_fbp=fb.1.1700000000000.1234567890; _fbc=fb.1.1700000000000.IwAR0abc',
    });
    expect(getMetaMatchParams()).toEqual({
      fbp: 'fb.1.1700000000000.1234567890',
      fbc: 'fb.1.1700000000000.IwAR0abc',
    });
  });

  it('reconstructs _fbc from a stored fbclid when Meta never wrote the cookie', () => {
    vi.stubGlobal('document', { cookie: '_fbp=fb.1.1700000000000.999' });
    const result = getMetaMatchParams('IwAR0xyz', 1700000000000);
    expect(result.fbc).toBe('fb.1.1700000000000.IwAR0xyz');
  });

  it('prefers the real cookie over the reconstruction', () => {
    vi.stubGlobal('document', { cookie: '_fbc=fb.1.1.real' });
    expect(getMetaMatchParams('fallback-clid', 1700000000000).fbc).toBe('fb.1.1.real');
  });

  it('returns an empty object when nothing is available', () => {
    expect(getMetaMatchParams()).toEqual({});
  });
});

describe('buildMetaOrderAttribution', () => {
  const stubBrowser = (consent: string | null, cookie = '') => {
    vi.stubGlobal('window', {
      location: {
        href: 'https://bajkoterapia.org/problem/moczenie-nocne/zamow',
        origin: 'https://bajkoterapia.org',
      },
    });
    vi.stubGlobal('document', { cookie });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (test)' });
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'analyticsEnabled' ? consent : null),
    });
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns undefined when the visitor rejected the cookie banner', () => {
    stubBrowser('false', '_fbp=fb.1.1.abc');
    expect(buildMetaOrderAttribution()).toBeUndefined();
  });

  it('returns undefined when the banner was never answered', () => {
    stubBrowser(null, '_fbp=fb.1.1.abc');
    expect(buildMetaOrderAttribution()).toBeUndefined();
  });

  it('returns undefined when localStorage throws (private mode)', () => {
    vi.stubGlobal('window', { location: { href: 'https://bajkoterapia.org/' } });
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });
    expect(buildMetaOrderAttribution()).toBeUndefined();
  });

  it('captures match keys, user agent and source URL once consent is granted', () => {
    stubBrowser('true', '_fbp=fb.1.1700000000000.42');
    expect(buildMetaOrderAttribution()).toEqual({
      fbp: 'fb.1.1700000000000.42',
      userAgent: 'Mozilla/5.0 (test)',
      eventSourceUrl: 'https://bajkoterapia.org',
      marketingConsent: true,
    });
  });

  /**
   * The one property here with legal consequences rather than merely
   * analytical ones. Every topic on this site names a child's behavioural
   * or health difficulty, so a URL like /problem/moczenie-nocne/zamow is
   * special-category data under RODO art. 9. Section 8 of the privacy
   * policy promises users we do not send it. This test is what keeps that
   * promise true when someone later "fixes" the source URL to be more
   * useful for reporting.
   */
  it('never leaks the problem topic in the server-side source URL', () => {
    stubBrowser('true', '_fbp=fb.1.1700000000000.42');
    const attribution = buildMetaOrderAttribution();
    const serialised = JSON.stringify(attribution);
    expect(serialised).not.toContain('moczenie-nocne');
    expect(serialised).not.toContain('/problem/');
    expect(attribution?.eventSourceUrl).toBe('https://bajkoterapia.org');
  });
});
