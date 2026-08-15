/**
 * Meta Pixel — Facebook / Instagram retargeting, consent-gated.
 *
 * The pixel base code and a `consent revoke` baseline are injected in
 * src/root.tsx, mirroring the GA4 arrangement one file over in gtag.ts: the
 * revoke call MUST run before `fbq('init')`, so it has to live in the
 * SSR-rendered HTML rather than a lazily-loaded bundle. Everything after
 * hydration talks to fbq() through this module.
 *
 * Consent policy: Meta rides the SAME cookie-banner toggle as GA4 rather
 * than getting its own "marketing" category. That toggle already grants
 * Google's `ad_storage` / `ad_personalization`, so advertising consent is
 * what it has always in fact meant here.
 *
 * Deduplication with the Conversions API: every event that is also sent
 * server-side carries an `eventID`. Meta drops the duplicate when the
 * (event_name, event_id) pair matches within its dedup window.
 * `metaPurchaseEventId` is the shared formula — convex/metaCapi.ts derives
 * the identical string from the same order id, so the two sides never have
 * to coordinate at runtime.
 */

/**
 * Pixel ID, set via Vite env at build time: `VITE_META_PIXEL_ID`.
 *
 * Unset = the whole integration is inert (no script injected, every helper
 * below no-ops). Same escape hatch as `GOOGLE_ADS_ID` in gtag.ts, so this
 * can land on main and deploy before the Meta account exists.
 *
 * NOTE: Vite inlines this at BUILD time, and Vercel deploys here are manual
 * (`npm run deploy`). Setting the variable in Vercel is not enough — the
 * next build after setting it is what actually carries the ID.
 */
export const META_PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined) ?? '';

/**
 * Meta's domain-verification token for bajkoterapia.org, from Business
 * settings → Brand safety → Domains (portfolio `Trustee Interactive`).
 * Needed for Aggregated Event Measurement — the iOS event-priority list —
 * and to stop anyone else claiming the domain in their own Business
 * Manager.
 *
 * Hardcoded rather than env-driven on purpose, unlike the pixel id above.
 * It is public (it renders into the HTML of every page), it is a property
 * of the domain rather than of an environment, and it never rotates. An
 * env var would add a build-time step whose only possible outcome is
 * forgetting it and silently never being verified.
 */
export const META_DOMAIN_VERIFICATION = 'x7llhzebi6a8xfdwdqjg3jrrtmube5';

type FbqFn = ((...args: unknown[]) => void) & { loaded?: boolean };

function getFbq(): FbqFn | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { fbq?: FbqFn };
  return typeof w.fbq === 'function' ? w.fbq : null;
}

/**
 * Meta standard events we map onto. Deliberately a closed list: Meta's
 * optimiser only recognises its own standard vocabulary, and a typo'd
 * event name silently becomes a custom event nobody can optimise for.
 */
export type MetaStandardEvent =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase';

/** Non-standard events worth an audience but with no standard equivalent. */
export type MetaCustomEvent = 'OrderStarted';

/**
 * Flip Meta's consent flag. Called from the same place that flips GA4's
 * (`useConsent` in telemetry.ts), so the two can never disagree.
 *
 * Events fired while revoked are queued by fbevents.js and released on
 * grant — which is what we want: a visitor who accepts the banner one
 * scroll into the page still counts as having viewed it. A visitor who
 * rejects has nothing released, ever.
 */
export function setMarketingConsent(granted: boolean): void {
  const fbq = getFbq();
  if (!fbq) return;
  fbq('consent', granted ? 'grant' : 'revoke');
}

/** Fire a Meta standard event, optionally with a dedup id. */
export function trackMetaStandard(
  event: MetaStandardEvent,
  params?: Record<string, unknown>,
  eventId?: string,
): void {
  const fbq = getFbq();
  if (!fbq) return;
  if (eventId) fbq('track', event, params ?? {}, { eventID: eventId });
  else fbq('track', event, params ?? {});
}

/** Fire a Meta custom event (audience-building only, not optimisable). */
export function trackMetaCustom(event: MetaCustomEvent, params?: Record<string, unknown>): void {
  const fbq = getFbq();
  if (!fbq) return;
  fbq('trackCustom', event, params ?? {});
}

/**
 * Everything a route change owes Meta: the PageView every SPA navigation
 * needs, plus a `ViewContent` on topic landing pages.
 *
 * `ViewContent` is what makes the only audience this site can currently
 * fill — "looked at a problem page, never ordered". It is keyed off the
 * path rather than a funnel event on purpose: `topic_selected` fires when
 * someone picks a topic from a list, which is a different and much rarer
 * act than arriving on `/problem/<slug>` from a Google ad.
 */
export function trackMetaRouteChange(pathname: string): void {
  const fbq = getFbq();
  if (!fbq) return;

  fbq('track', 'PageView');

  const topicMatch = pathname.match(/^\/problem\/([^/]+)/);
  if (topicMatch) {
    fbq('track', 'ViewContent', {
      content_type: 'product',
      content_ids: [topicMatch[1]],
      content_category: 'bajka-terapeutyczna',
    });
  }
}

/**
 * Deduplication key for the purchase conversion.
 *
 * Both sides derive it from the order id alone — no timestamp, no random
 * component — so the browser event and the Stripe-webhook event collide on
 * purpose and Meta counts one sale. Keep this formula byte-identical to
 * `metaPurchaseEventId` in convex/metaCapi.ts.
 */
export function metaPurchaseEventId(orderId: string): string {
  return `purchase_${orderId}`;
}

/**
 * Read a cookie by name. Meta writes `_fbp` (browser id) itself and `_fbc`
 * (click id) when a visitor arrives with `?fbclid=`.
 */
function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export interface MetaMatchParams {
  fbp?: string;
  fbc?: string;
}

/**
 * The two browser-side identifiers the Conversions API needs to match a
 * server event back to the person who clicked the ad. Without them a
 * server-side Purchase is nearly unattributable, so we snapshot them onto
 * the order at creation time and let the webhook read them back later.
 *
 * `_fbc` fallback: Meta only writes that cookie when its own script sees
 * the `fbclid` — if the visitor rejected consent on the ad click and
 * accepted on a later visit, the cookie is missing while our own
 * attribution snapshot still holds the `fbclid`. Meta documents the
 * reconstruction format as `fb.1.<creation-ms>.<fbclid>`.
 */
export function getMetaMatchParams(fallbackFbclid?: string, fallbackTimestamp?: number) {
  const params: MetaMatchParams = {};
  const fbp = readCookie('_fbp');
  if (fbp) params.fbp = fbp;

  const fbc = readCookie('_fbc');
  if (fbc) params.fbc = fbc;
  else if (fallbackFbclid) {
    params.fbc = `fb.1.${fallbackTimestamp ?? Date.now()}.${fallbackFbclid}`;
  }

  return params;
}

/**
 * The full snapshot persisted onto a new order so the Stripe webhook can
 * report the Purchase server-side, hours later, from a context that has no
 * browser at all.
 *
 * `marketingConsent` is read from the banner's own localStorage key rather
 * than passed in, so a caller cannot accidentally submit `true` for someone
 * who rejected. Returns `undefined` when there is nothing worth storing:
 * no consent means no server-side send, and with no consent and no match
 * keys the record would be an empty object pretending to be attribution.
 */
export function buildMetaOrderAttribution(fallbackFbclid?: string, fallbackTimestamp?: number) {
  if (typeof window === 'undefined') return undefined;

  let marketingConsent = false;
  try {
    marketingConsent = localStorage.getItem('analyticsEnabled') === 'true';
  } catch {
    // Private mode / blocked storage — treat as no consent, which is both
    // the safe reading and what the banner itself would conclude.
    return undefined;
  }
  if (!marketingConsent) return undefined;

  const match = getMetaMatchParams(fallbackFbclid, fallbackTimestamp);
  return {
    ...match,
    userAgent: navigator.userAgent,
    eventSourceUrl: window.location.href,
    marketingConsent: true,
  };
}
