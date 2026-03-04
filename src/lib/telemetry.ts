/**
 * PostHog Analytics & Feature Flags
 *
 * This module provides hooks and utilities for analytics tracking and feature flags.
 * IMPORTANT: Always use hooks from this module instead of importing posthog-js directly.
 *
 * @see docs/posthog.md for usage documentation
 */
import {
  usePostHog,
  useFeatureFlagEnabled,
  useFeatureFlagVariantKey,
  useFeatureFlagPayload,
} from '@posthog/react';
import { useCallback, useEffect, useMemo } from 'react';

// Re-export React components from @posthog/react
export { PostHogFeature, PostHogCaptureOnViewed } from '@posthog/react';

// ============================================================================
// TYPES
// ============================================================================

export type TelemetryEvent =
  | 'chat_view_opened'
  | 'widget_rendered'
  | 'option_selected'
  | 'free_text_entered'
  | 'validation_failed'
  | 'xml_field_completed'
  | 'outline_generated'
  | 'module_toggled'
  | 'checkout_started'
  | 'checkout_completed'
  | 'page_view'
  | 'button_clicked';

export interface TelemetryProps {
  session_id?: string;
  step?: string;
  widget_type?: string;
  time_to_answer_ms?: number;
  profile_hash?: string;
  ab_variant?: string;
  [key: string]: unknown;
}

// ============================================================================
// ANALYTICS HOOKS
// ============================================================================

/**
 * Main analytics hook for tracking events and managing user identity.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { track, identify, isEnabled } = useAnalytics();
 *
 *   const handleClick = () => {
 *     track('button_clicked', { button_name: 'submit' });
 *   };
 *
 *   return <button onClick={handleClick}>Submit</button>;
 * }
 * ```
 */
export function useAnalytics() {
  const posthog = usePostHog();

  const isEnabled = useMemo(() => {
    return posthog?.has_opted_in_capturing() ?? false;
  }, [posthog]);

  const track = useCallback(
    (event: TelemetryEvent, properties?: TelemetryProps) => {
      if (!posthog) {
        console.debug(`PostHog not initialized, skipping: ${event}`, properties);
        return;
      }
      posthog.capture(event, properties);
      console.debug(`Tracked: ${event}`, properties);
    },
    [posthog],
  );

  const identify = useCallback(
    (userId: string, properties?: Record<string, unknown>) => {
      posthog?.identify(userId, properties);
    },
    [posthog],
  );

  const reset = useCallback(() => {
    posthog?.reset();
  }, [posthog]);

  const getSessionId = useCallback((): string | undefined => {
    return posthog?.get_session_id();
  }, [posthog]);

  const setPersonProperties = useCallback(
    (properties: Record<string, unknown>) => {
      posthog?.setPersonProperties(properties);
    },
    [posthog],
  );

  const group = useCallback(
    (groupType: string, groupKey: string, groupProperties?: Record<string, unknown>) => {
      posthog?.group(groupType, groupKey, groupProperties);
    },
    [posthog],
  );

  return {
    posthog,
    track,
    identify,
    reset,
    getSessionId,
    setPersonProperties,
    group,
    isEnabled,
  };
}

// ============================================================================
// CONSENT MANAGEMENT
// ============================================================================

const CONSENT_KEY = 'cookieConsent';
const ANALYTICS_KEY = 'analyticsEnabled';

export type ConsentStatus = 'accepted' | 'rejected' | 'custom' | null;

/**
 * Hook for managing cookie/analytics consent.
 *
 * @example
 * ```tsx
 * function CookieBanner() {
 *   const { consentStatus, acceptAll, rejectAll } = useConsent();
 *
 *   if (consentStatus) return null; // Already has consent
 *
 *   return (
 *     <div>
 *       <button onClick={acceptAll}>Accept</button>
 *       <button onClick={rejectAll}>Reject</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useConsent() {
  const posthog = usePostHog();

  const consentStatus = useMemo((): ConsentStatus => {
    return localStorage.getItem(CONSENT_KEY) as ConsentStatus;
  }, []);

  const isAnalyticsEnabled = useMemo(() => {
    return localStorage.getItem(ANALYTICS_KEY) === 'true';
  }, []);

  const acceptAll = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    localStorage.setItem(ANALYTICS_KEY, 'true');
    posthog?.opt_in_capturing();
    console.log('Analytics enabled');
  }, [posthog]);

  const rejectAll = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    localStorage.setItem(ANALYTICS_KEY, 'false');
    posthog?.opt_out_capturing();
    console.log('Analytics disabled');
  }, [posthog]);

  const setCustomConsent = useCallback(
    (analytics: boolean) => {
      localStorage.setItem(CONSENT_KEY, 'custom');
      localStorage.setItem(ANALYTICS_KEY, analytics ? 'true' : 'false');
      if (analytics) {
        posthog?.opt_in_capturing();
        console.log('Analytics enabled (custom)');
      } else {
        posthog?.opt_out_capturing();
        console.log('Analytics disabled (custom)');
      }
    },
    [posthog],
  );

  // Apply saved consent on mount
  useEffect(() => {
    const savedConsent = localStorage.getItem(CONSENT_KEY);
    const analyticsEnabled = localStorage.getItem(ANALYTICS_KEY) === 'true';

    if (savedConsent && analyticsEnabled) {
      posthog?.opt_in_capturing();
    }
  }, [posthog]);

  return {
    consentStatus,
    isAnalyticsEnabled,
    acceptAll,
    rejectAll,
    setCustomConsent,
  };
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Check if a boolean feature flag is enabled.
 * Sends a $feature_flag_called event automatically.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const showNewFeature = useFeatureFlag('new-feature');
 *
 *   if (showNewFeature) {
 *     return <NewFeature />;
 *   }
 *   return <OldFeature />;
 * }
 * ```
 */
export function useFeatureFlag(flagKey: string): boolean {
  return useFeatureFlagEnabled(flagKey) ?? false;
}

/**
 * Get the variant key of a multivariate feature flag.
 * Sends a $feature_flag_called event automatically.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const variant = useFeatureFlagVariant('experiment-button-color');
 *
 *   if (variant === 'blue') return <BlueButton />;
 *   if (variant === 'green') return <GreenButton />;
 *   return <DefaultButton />;
 * }
 * ```
 */
export function useFeatureFlagVariant(flagKey: string): string | boolean | undefined {
  return useFeatureFlagVariantKey(flagKey);
}

/**
 * Get the payload of a feature flag.
 * NOTE: Does NOT send $feature_flag_called event - use with useFeatureFlag or useFeatureFlagVariant.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isEnabled = useFeatureFlag('welcome-message');
 *   const payload = useFeatureFlagPayloadData<{ title: string; body: string }>('welcome-message');
 *
 *   if (isEnabled && payload) {
 *     return <h1>{payload.title}</h1>;
 *   }
 *   return null;
 * }
 * ```
 */
export function useFeatureFlagPayloadData<T = unknown>(flagKey: string): T | undefined {
  return useFeatureFlagPayload(flagKey) as T | undefined;
}

/**
 * Combined hook for feature flag with payload.
 * Returns both enabled status and payload for convenience.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { enabled, payload } = useFeatureFlagWithPayload<{ discount: number }>('promo-banner');
 *
 *   if (!enabled) return null;
 *   return <Banner discount={payload?.discount} />;
 * }
 * ```
 */
export function useFeatureFlagWithPayload<T = unknown>(flagKey: string) {
  const enabled = useFeatureFlagEnabled(flagKey) ?? false;
  const payload = useFeatureFlagPayload(flagKey) as T | undefined;

  return { enabled, payload };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate a hash for profile data (for anonymization in events).
 */
export function generateProfileHash(profileData: unknown): string {
  const str = typeof profileData === 'string' ? profileData : JSON.stringify(profileData);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Track page view with optional properties.
 * Use this for manual page view tracking since autocapture is disabled.
 */
export function usePageView(pageName: string, properties?: Record<string, unknown>) {
  const { track } = useAnalytics();

  useEffect(() => {
    track('page_view', { page: pageName, ...properties });
  }, [pageName, properties, track]);
}
