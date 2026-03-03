/**
 * useSessionToken - Hook for managing session tokens for URL-based session sharing
 *
 * Features:
 * - Reads ?session=xxx from URL parameters
 * - Validates token via Convex API
 * - Persists token in sessionStorage as fallback
 * - Provides session sharing functionality
 */

import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

const SESSION_TOKEN_KEY = 'ait_session_token';

interface UseSessionTokenResult {
  /** Current session token (from URL or sessionStorage) */
  sessionToken: string | null;

  /** Whether the token has been validated */
  isValidated: boolean;

  /** Whether the token is valid (maps to a real session) */
  isValid: boolean;

  /** Whether validation is in progress */
  isValidating: boolean;

  /** Session id is intentionally not exposed for security reasons */
  sessionId: null;

  /** Clear the stored session token */
  clearToken: () => void;

  /** Get shareable URL for current session */
  getShareableUrl: (token: string) => string;
}

/**
 * Hook to manage session tokens for cross-device session continuity
 */
export function useSessionToken(): UseSessionTokenResult {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);

  // Read session token from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('session');

    if (urlToken) {
      // URL takes precedence
      setSessionToken(urlToken);
      // Store in sessionStorage for this browser tab/session
      sessionStorage.setItem(SESSION_TOKEN_KEY, urlToken);
      // Clean URL (remove session param)
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('session');
      window.history.replaceState({}, '', newUrl.toString());
    } else {
      // Fallback to sessionStorage
      const storedToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
      if (storedToken) {
        setSessionToken(storedToken);
      }
    }
  }, []);

  // Validate token via Convex API
  const tokenValidationQuery = useQuery(api.sessions.getSessionIdFromToken, sessionToken ? { token: sessionToken } : 'skip');

  // Track validation state
  useEffect(() => {
    if (sessionToken && tokenValidationQuery !== undefined) {
      setIsValidated(true);
    }
  }, [sessionToken, tokenValidationQuery]);

  const clearToken = () => {
    setSessionToken(null);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    setIsValidated(false);
  };

  const getShareableUrl = (token: string): string => {
    const url = new URL(window.location.origin);
    url.searchParams.set('session', token);
    return url.toString();
  };

  return {
    sessionToken,
    isValidated,
    isValid: tokenValidationQuery?.valid === true,
    isValidating: sessionToken !== null && !isValidated,
    sessionId: null,
    clearToken,
    getShareableUrl,
  };
}
