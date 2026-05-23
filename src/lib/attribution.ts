/**
 * Marketing attribution capture — `gclid`, `utm_*`, `referrer`.
 *
 * Google Ads tags every click with `?gclid=...` (and `?gbraid=` / `?wbraid=`
 * for app/web cross-device). UTM params come from any campaign that tags
 * its links. We capture them once on first visit, persist to localStorage,
 * and stamp every PostHog event + every Convex order with the snapshot so
 * the conversion can be attributed back to the campaign that paid for it.
 *
 * Why not just read `document.referrer`? Because the redirect-to-Stripe and
 * back through `/landing/book/.../result?checkout=success` blows away
 * `document.referrer` (now points to checkout.stripe.com). The localStorage
 * snapshot survives the round-trip; that's the whole point.
 */

const STORAGE_KEY = 'bajkot_attribution_v1';

const ATTRIBUTION_PARAMS = [
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'msclkid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

type AttributionKey = (typeof ATTRIBUTION_PARAMS)[number];

export type Attribution = Partial<Record<AttributionKey, string>> & {
  capturedAt?: number;
  landingPath?: string;
  referrer?: string;
};

/**
 * Read attribution params from the current URL and persist if any were set.
 * First-touch wins — subsequent visits with new UTMs do NOT overwrite the
 * stored attribution. (Switch to last-touch if the business model rewards
 * remarketing more than first-touch acquisition; first-touch is the safer
 * default for paid acquisition reporting.)
 */
export function captureAttributionFromUrl(): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const captured: Attribution = {};
  for (const key of ATTRIBUTION_PARAMS) {
    const value = params.get(key);
    if (value) captured[key] = value;
  }

  // Nothing to capture — leave existing attribution (if any) intact.
  if (Object.keys(captured).length === 0) return;

  // First-touch: don't overwrite if we already have data.
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
  } catch {
    return;
  }

  captured.capturedAt = Date.now();
  captured.landingPath = window.location.pathname;
  captured.referrer = document.referrer || undefined;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
  } catch {
    // Quota / private mode — attribution is best-effort, never block UX.
  }
}

export function getAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Attribution;
  } catch {
    return null;
  }
}

/**
 * Flatten attribution into a `Record<string, unknown>` suitable for spreading
 * into PostHog event properties or Convex mutation args. Returns `{}` (not
 * null) so callers can spread without conditional logic.
 */
export function getAttributionProps(): Record<string, unknown> {
  const a = getAttribution();
  return a ? { ...a } : {};
}
