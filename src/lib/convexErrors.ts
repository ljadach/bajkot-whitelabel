import { ConvexError } from 'convex/values';

/**
 * Pull a user-facing message out of an error thrown by a Convex action.
 *
 * Convex sanitizes plain `throw new Error(msg)` into "Server Error" before
 * the message reaches the client. Backend code that wants the parent to
 * see the actual reason (form moderation, validation, rate-limit) must
 * `throw new ConvexError(msg)` — its payload is preserved on `.data`.
 *
 * This helper handles both forms plus the fallback so call sites stay
 * one-liners:
 *
 *   setSubmitError(extractErrorMessage(err, t('flow.errorGeneric')));
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError && typeof err.data === 'string' && err.data.trim()) {
    return err.data;
  }
  // Convex prefixes the sanitized message with "[CONVEX A(...)] [Request ID:
  // ...]", so an exact !== 'Server Error' check let the raw prefixed string
  // through to the UI (prod incident 2026-08-19).
  if (err instanceof Error && err.message && !err.message.includes('Server Error')) {
    return err.message;
  }
  return fallback;
}
