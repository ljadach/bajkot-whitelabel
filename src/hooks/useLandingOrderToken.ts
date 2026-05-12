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
