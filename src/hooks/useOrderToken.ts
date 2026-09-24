/**
 * Per-order access tokens (frontend side).
 *
 * `startLandingOrder` returns a raw token once. We store it in localStorage
 * keyed by orderId so the parent can come back to /bajka/:id later and the
 * queries/mutations still authenticate. Anyone without the token cannot read
 * the order's data even with the URL.
 */

const STORAGE_KEY = 'order_tokens';

type TokenMap = Record<string, string>;

function readMap(): TokenMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as TokenMap;
  } catch {
    // private mode / corrupt entry — treat as empty
  }
  return {};
}

function writeMap(map: TokenMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quota / private mode — the URL token still works for this page view
  }
}

export function saveOrderToken(orderId: string, token: string): void {
  const map = readMap();
  map[orderId] = token;
  writeMap(map);
}

function getOrderToken(orderId: string | undefined | null): string | null {
  if (!orderId) return null;
  return readMap()[orderId] ?? null;
}

/**
 * Pick up a `?t=<rawToken>` query param the email link planted on us and
 * persist it under the given orderId. The token is removed from the URL so
 * it doesn't sit in browser history, referrer headers, or screenshots.
 * Returns the resolved token (URL takes precedence, then localStorage) so
 * consumers can use it synchronously on the same render.
 *
 * Idempotent: safe to call on every render of a /bajka/:id page.
 */
export function captureOrderTokenFromUrl(orderId: string | undefined | null): string | null {
  if (typeof window === 'undefined') return getOrderToken(orderId);
  if (!orderId) return null;
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get('t');
  if (fromUrl) {
    saveOrderToken(orderId, fromUrl);
    url.searchParams.delete('t');
    const cleaned =
      url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '');
    window.history.replaceState(window.history.state, '', cleaned);
    return fromUrl;
  }
  return getOrderToken(orderId);
}
