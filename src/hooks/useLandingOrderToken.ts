/**
 * Per-order landing access tokens (frontend side).
 *
 * `startLandingOrder` returns a raw token once. We store it in localStorage
 * keyed by orderId so the parent can return to /landing/book/:id/* later and
 * the queries/mutations still authenticate. Anyone without the token in
 * localStorage cannot read the order's data even with the URL.
 */

const STORAGE_KEY = 'bajkot_landing_order_tokens';

type TokenMap = Record<string, string>;

function readMap(): TokenMap {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as TokenMap;
  } catch {
    // ignore — treat as empty
  }
  return {};
}

function writeMap(map: TokenMap): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function saveLandingOrderToken(orderId: string, token: string): void {
  const map = readMap();
  map[orderId] = token;
  writeMap(map);
}

export function getLandingOrderToken(orderId: string | undefined | null): string | null {
  if (!orderId) return null;
  const map = readMap();
  return map[orderId] ?? null;
}

export function clearLandingOrderToken(orderId: string): void {
  const map = readMap();
  delete map[orderId];
  writeMap(map);
}

/**
 * Pick up a `?t=<rawToken>` query param the email link planted on us and
 * persist it under the given orderId. The token is removed from the URL so
 * it doesn't sit in browser history, referrer headers, or screenshots.
 * Returns the resolved token (URL takes precedence, then localStorage) so
 * consumers can use it synchronously on the same render.
 *
 * Idempotent: safe to call on every mount of a `/landing/book/:id/*` route.
 * No-op on SSR or when no `?t=` is present and no order is given.
 */
export function captureLandingOrderTokenFromUrl(orderId: string | undefined | null): string | null {
  if (typeof window === 'undefined') return getLandingOrderToken(orderId);
  if (!orderId) return null;
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get('t');
  if (fromUrl) {
    saveLandingOrderToken(orderId, fromUrl);
    url.searchParams.delete('t');
    const cleaned =
      url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '');
    window.history.replaceState({}, '', cleaned);
    return fromUrl;
  }
  return getLandingOrderToken(orderId);
}
