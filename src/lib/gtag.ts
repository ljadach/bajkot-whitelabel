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

import { BOOK_PRICE_PDF_PLN, BOOK_PRICE_PRINT_PLN } from '@lib/pricing';
import { getAttribution } from '@lib/attribution';
import { categoryForProblemId, categoryForLandingPath } from '../data/topics';

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
 * List price per format in PLN — the value we report to GA4/Ads. The real
 * billed amount lives on the Stripe session (not echoed back to the client),
 * but for value-based bidding the list price is the right signal since there
 * are no per-order discounts today. Falls back to the env default when the
 * pricing constants ever drift to 0.
 */
export function bookValueForFormat(format?: 'pdf' | 'pdf_print'): number {
  const listPrice = format === 'pdf_print' ? BOOK_PRICE_PRINT_PLN : BOOK_PRICE_PDF_PLN;
  return listPrice || DEFAULT_BOOK_VALUE_PLN;
}

/** Resolve the catalog category a visitor first landed on (the "entered via"
 *  side of the migration cross-tab) from the stored attribution snapshot. */
function entryCategory(): string | undefined {
  return categoryForLandingPath(getAttribution()?.landingPath) ?? undefined;
}

/**
 * One-shot guard so the purchase / payment_success pair fires at most once per
 * order, even if both the result page and the progress page happen to see
 * `?checkout=success`. Returns true when the caller should fire. Private-mode
 * sessionStorage failures fall through to firing — GA still dedupes on
 * `transaction_id`, so the worst case is a duplicate PostHog event, not money.
 */
export function markPurchaseTrackedOnce(orderId: string): boolean {
  if (typeof window === 'undefined') return false;
  const key = `bajkot_purchase_tracked_${orderId}`;
  try {
    if (sessionStorage.getItem(key) === '1') return false;
    sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}

/**
 * Fire a purchase event into GA4 + optionally a Google Ads conversion.
 *
 * - GA4 always gets the `purchase` event (gated only by Consent Mode v2),
 *   carrying value/format/category so revenue can be sliced by product and
 *   topic, and cross-tabbed against `entry_category` for migration analysis.
 * - Google Ads gets a `conversion` event only if both env vars above are
 *   set at build time. Use `transaction_id` to dedupe — calling twice
 *   with the same order ID is idempotent on Google's side.
 *
 * `value` defaults to the list price for `format`; pass an explicit value to
 * override.
 */
export function trackPurchase(args: {
  transactionId: string;
  format?: 'pdf' | 'pdf_print';
  problemId?: string | null;
  value?: number;
  currency?: string;
}): void {
  const gtag = getGtag();
  if (!gtag) return;

  const value = args.value ?? bookValueForFormat(args.format);
  const currency = args.currency ?? 'PLN';
  const format = args.format ?? 'pdf';
  const category = categoryForProblemId(args.problemId) ?? undefined;
  const entry = entryCategory();

  // GA4 ecommerce event — picked up by the GA4 property automatically once
  // the `purchase` event is enabled in Admin → Events. `book_*` / `entry_*`
  // params must be registered as custom dimensions in GA4 to show in reports.
  gtag('event', 'purchase', {
    transaction_id: args.transactionId,
    value,
    currency,
    book_format: format,
    book_category: category,
    entry_category: entry,
    items: [
      {
        item_name: 'Bajka',
        item_category: category,
        item_variant: format,
        price: value,
        quantity: 1,
      },
    ],
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

/**
 * Fire a GA4 event when a book has finished generating but isn't paid yet
 * (the paywall/preview view) — Łukasz's "wygenerował, nie zapłacił" funnel
 * step. GA4-only on purpose: whether this also becomes a Google Ads
 * (secondary) conversion for Smart Bidding is a marketing call left for later.
 * Carries the would-be value + format + category so the generated→paid step
 * segments the same way as purchases.
 */
export function trackBookGenerated(args: {
  transactionId: string;
  format?: 'pdf' | 'pdf_print';
  problemId?: string | null;
}): void {
  const gtag = getGtag();
  if (!gtag) return;

  gtag('event', 'book_generated', {
    transaction_id: args.transactionId,
    value: bookValueForFormat(args.format),
    currency: 'PLN',
    book_format: args.format ?? 'pdf',
    book_category: categoryForProblemId(args.problemId) ?? undefined,
    entry_category: entryCategory(),
  });
}
