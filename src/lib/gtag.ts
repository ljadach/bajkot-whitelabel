/**
 * Google Analytics 4 — Consent Mode v2 helpers.
 *
 * The gtag.js script + a `consent default = denied` baseline are injected
 * in src/root.tsx so we comply with PECR/RODO out of the box. This module
 * flips the analytics consent flag once the user accepts in the cookie
 * banner. Until then nothing is reported (Google's own consent gate).
 *
 * Why split the inline script from this module: the default-deny consent
 * call MUST run before the first config, which means it has to be in the
 * SSR-rendered HTML, not loaded from a JS bundle. Once we're past hydration
 * we can talk to gtag() like any other API.
 */

export const GA_MEASUREMENT_ID = 'G-3QB3EX66Z2';

type GtagFn = (...args: unknown[]) => void;

function getGtag(): GtagFn | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { gtag?: GtagFn };
  return typeof w.gtag === 'function' ? w.gtag : null;
}

/** Flip Google Consent Mode for analytics storage. Safe pre-hydration. */
export function setAnalyticsConsent(granted: boolean): void {
  const gtag = getGtag();
  if (!gtag) return;
  gtag('consent', 'update', {
    analytics_storage: granted ? 'granted' : 'denied',
  });
}

/** Manual page_view (we run SPA navigations; gtag only auto-pings the first load). */
export function trackGaPageview(path: string): void {
  const gtag = getGtag();
  if (!gtag) return;
  gtag('event', 'page_view', {
    page_path: path,
    page_location: typeof window !== 'undefined' ? window.location.href : path,
  });
}
