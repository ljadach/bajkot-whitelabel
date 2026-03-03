import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { usePostHog } from '@posthog/react';

/**
 * Tracks SPA page views in PostHog.
 *
 * PostHog's `capture_pageview: true` only captures the initial page load.
 * For client-side navigation (React Router), we need to manually capture
 * $pageview events when the route changes.
 *
 * Place this component inside <BrowserRouter> to track all route changes.
 */
export function PostHogPageviewTracker() {
  const location = useLocation();
  const posthog = usePostHog();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip if PostHog not initialized or same path (prevents double-fire on mount)
    if (!posthog || location.pathname === lastPathRef.current) {
      return;
    }

    lastPathRef.current = location.pathname;

    posthog.capture('$pageview', {
      $current_url: window.location.href,
    });
  }, [location.pathname, location.search, posthog]);

  return null;
}
