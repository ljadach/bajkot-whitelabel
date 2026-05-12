/**
 * Per-order landing access tokens.
 *
 * The landing flow has no Clerk identity — anyone with an `orderId` URL could
 * otherwise read child profile data, vote on style, or submit a dedication.
 * Per-order tokens close that gap: `startLandingOrder` mints a fresh token,
 * stores only its SHA-256 hash in the row, and returns the raw token once
 * to the caller. Every subsequent landing call requires the raw token, which
 * is compared against the stored hash via a constant-time helper.
 */

/** SHA-256 hex digest using Web Crypto (Convex V8 runtime). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/** 256-bit random base64url token (43 chars, no padding). */
export function generateLandingAccessToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Constant-time string equality. Both hashes are fixed-length hex digests,
 * so length-mismatched callers are rejected upfront. The loop walks every
 * char regardless of mismatch to deny timing side channels.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
