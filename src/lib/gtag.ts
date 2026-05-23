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

/**
 * Optional Google Ads conversion config. Set via Vite env at build time:
 *   VITE_GOOGLE_ADS_ID            — full ID, e.g. "AW-1234567890"
 *   VITE_GOOGLE_ADS_PURCHASE_LABEL — conversion action label, e.g. "abc123XYZ"
 *
 * Both must be set for `trackPurchase` to fire a Google Ads conversion;
 * otherwise only the GA4 `purchase` event ships. The Ads config script is
 * injected from `root.tsx` so consent gating works the same way as GA4.
 */
export const GOOGLE_ADS_ID = (import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined) ?? '';
export const GOOGLE_ADS_PURCHASE_LABEL =
  (import.meta.env.VITE_GOOGLE_ADS_PURCHASE_LABEL as string | undefined) ?? '';

/**
 * Optional default revenue per book in PLN. Used when the Stripe redirect
 * doesn't carry the paid amount back to the client (it usually doesn't —
 * `amount_total` lives on the session, not in the success URL). Hardcoded
 * fallback keeps Google Ads' value-based bidding informed without a
 * server round-trip.
 */
export const DEFAULT_BOOK_VALUE_PLN = Number(import.meta.env.VITE_BOOK_VALUE_PLN ?? '0') || 0;

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
    ad_storage: granted ? 'granted' : 'denied',
    ad_user_data: granted ? 'granted' : 'denied',
    ad_personalization: granted ? 'granted' : 'denied',
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

/**
 * Fire a purchase event into GA4 + optionally a Google Ads conversion.
 *
 * - GA4 always gets the `purchase` event (gated only by Consent Mode v2).
 * - Google Ads gets a `conversion` event only if both env vars above are
 *   set at build time. Use `transaction_id` to dedupe — calling twice
 *   with the same order ID is idempotent on Google's side.
 *
 * `value` defaults to `DEFAULT_BOOK_VALUE_PLN`; pass `0` to suppress.
 */
export function trackPurchase(args: {
  transactionId: string;
  value?: number;
  currency?: string;
  itemName?: string;
}): void {
  const gtag = getGtag();
  if (!gtag) return;

  const value = args.value ?? DEFAULT_BOOK_VALUE_PLN;
  const currency = args.currency ?? 'PLN';

  // GA4 ecommerce event — picked up by the GA4 property automatically once
  // the `purchase` event is enabled in Admin → Events.
  gtag('event', 'purchase', {
    transaction_id: args.transactionId,
    value,
    currency,
    items: [{ item_name: args.itemName ?? 'Bajka' }],
  });

  // Google Ads conversion — only when configured. `send_to` requires the
  // full "AW-XXXX/LABEL" form; an unconfigured deploy stays silent.
  if (GOOGLE_ADS_ID && GOOGLE_ADS_PURCHASE_LABEL) {
    gtag('event', 'conversion', {
      send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_PURCHASE_LABEL}`,
      transaction_id: args.transactionId,
      value,
      currency,
    });
  }
}
