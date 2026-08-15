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
import posthog from 'posthog-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setAnalyticsConsent, trackGaFunnelEvent } from './gtag';
import {
  setMarketingConsent,
  trackMetaCustom,
  trackMetaStandard,
  type MetaCustomEvent,
  type MetaStandardEvent,
} from './metaPixel';

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

export type ConsentStatus = 'accepted' | 'rejected' | 'custom' | 'dismissed' | null;

/**
 * Push one consent decision out to every third party that needs it.
 *
 * Decision 2026-08-15: the Meta pixel rides the SAME banner toggle as GA4
 * instead of getting its own "marketing" category. That toggle has always
 * granted Google's `ad_storage` / `ad_user_data` / `ad_personalization`,
 * so it already means advertising consent — splitting it now would only
 * shrink an already small retargeting pool without changing what the user
 * is actually agreeing to.
 *
 * Every flip goes through here so a future third platform cannot be added
 * to four of the five call sites and forgotten on the fifth.
 */
function applyTrackingConsent(granted: boolean): void {
  setAnalyticsConsent(granted);
  setMarketingConsent(granted);
}

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

  // `undefined` = pre-hydration (don't render the banner yet to avoid a
  // flash on routes where the user already consented). `null` = hydrated
  // and never consented. Concrete strings = user's decision. Reading
  // localStorage during render would break SSR prerender + hydration.
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | undefined>(undefined);
  const [isAnalyticsEnabled, setIsAnalyticsEnabled] = useState(false);

  useEffect(() => {
    setConsentStatus((localStorage.getItem(CONSENT_KEY) as ConsentStatus) ?? null);
    setIsAnalyticsEnabled(localStorage.getItem(ANALYTICS_KEY) === 'true');
  }, []);

  const acceptAll = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    localStorage.setItem(ANALYTICS_KEY, 'true');
    setConsentStatus('accepted');
    setIsAnalyticsEnabled(true);
    posthog?.opt_in_capturing();
    applyTrackingConsent(true);
  }, [posthog]);

  const rejectAll = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    localStorage.setItem(ANALYTICS_KEY, 'false');
    setConsentStatus('rejected');
    setIsAnalyticsEnabled(false);
    posthog?.opt_out_capturing();
    applyTrackingConsent(false);
  }, [posthog]);

  const dismiss = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'dismissed');
    localStorage.setItem(ANALYTICS_KEY, 'false');
    setConsentStatus('dismissed');
    setIsAnalyticsEnabled(false);
    posthog?.opt_out_capturing();
    applyTrackingConsent(false);
  }, [posthog]);

  const setCustomConsent = useCallback(
    (analytics: boolean) => {
      localStorage.setItem(CONSENT_KEY, 'custom');
      localStorage.setItem(ANALYTICS_KEY, analytics ? 'true' : 'false');
      setConsentStatus('custom');
      setIsAnalyticsEnabled(analytics);
      if (analytics) posthog?.opt_in_capturing();
      else posthog?.opt_out_capturing();
      applyTrackingConsent(analytics);
    },
    [posthog],
  );

  // Apply saved consent on mount — both PostHog and GA Consent Mode.
  useEffect(() => {
    const savedConsent = localStorage.getItem(CONSENT_KEY);
    const analyticsEnabled = localStorage.getItem(ANALYTICS_KEY) === 'true';

    if (savedConsent && analyticsEnabled) {
      posthog?.opt_in_capturing();
      applyTrackingConsent(true);
    }
  }, [posthog]);

  return {
    consentStatus,
    isAnalyticsEnabled,
    acceptAll,
    rejectAll,
    setCustomConsent,
    dismiss,
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
// FUNNEL EVENTS (intake → engagement spec, sections 7 + 7.1)
// ============================================================================

/**
 * Closed list of funnel event names. Mirrors docs/spec-intake-engagement.md
 * sections 7 + 7.1. Pageviews (`homepage_viewed`, `topic_landing_viewed`)
 * are captured automatically by `capture_pageview: true` and intentionally
 * omitted here.
 */
export type FunnelEventName =
  | 'cta_create_book_clicked'
  // Fired on the first real edit inside the intake form. `order_form_step_viewed`
  // cannot play this role: the landing wizard is mounted inline on every topic
  // page, so it fires for every visitor whether or not they touch the form.
  | 'order_started'
  | 'order_form_step_viewed'
  | 'order_form_step_completed'
  | 'topic_selected'
  | 'preview_viewed'
  | 'checkout_viewed'
  | 'checkout_format_changed'
  | 'checkout_submit_clicked'
  | 'payment_success'
  | 'payment_cancelled'
  | 'progress_viewed'
  | 'style_vote_viewed'
  | 'style_vote_submitted'
  | 'dedication_submitted'
  | 'dedication_skipped'
  | 'result_viewed'
  | 'pdf_downloaded'
  | 'print_thanks_viewed'
  | 'print_requested_from_result'
  | 'preview_paywall_viewed'
  | 'preview_paywall_unlock_clicked'
  | 'preview_open_in_new_tab'
  // Landing-page engagement — how deep a visitor got before (not) converting.
  | 'home_topic_clicked'
  | 'lp_section_viewed'
  | 'lp_scroll_depth'
  | 'lp_faq_opened'
  | 'lp_print_gallery_opened'
  | 'lp_sample_book_opened'
  | 'lp_promo_video_played'
  | 'lp_name_demo_used';

/**
 * Default flow tag attached to events when relevant. The caller component
 * knows whether it's running in the auth or landing branch.
 */
export type FunnelFlow = 'auth' | 'landing';

/**
 * Funnel events that also mean something to Meta, and what they mean.
 *
 * Kept as a table next to `trackEvent` rather than sprinkled through the
 * components on purpose: the Meta pixel and PostHog must describe the same
 * funnel, and the only way to guarantee that is one call site. Adding a
 * row here is the whole cost of putting a new stage in front of Meta.
 *
 * Only mid-funnel stages live here. `ViewContent` rides route changes
 * (see `trackMetaRouteChange`) and `Purchase` rides `trackPurchase` in
 * gtag.ts, which already owns the once-per-order conversion guard.
 */
const META_FUNNEL_MAP: Partial<
  Record<FunnelEventName, { standard: MetaStandardEvent } | { custom: MetaCustomEvent }>
> = {
  // First real edit inside the intake form. No Meta standard event fits
  // "started filling in a form", so it stays custom — audience-only, not
  // something Meta can optimise delivery towards.
  order_started: { custom: 'OrderStarted' },
  // The paywall is where the parent has seen the finished book and is
  // deciding. In Meta's vocabulary that is the cart, not the checkout.
  preview_paywall_viewed: { standard: 'AddToCart' },
  checkout_submit_clicked: { standard: 'InitiateCheckout' },
};

/**
 * The same funnel stages, named for GA4.
 *
 * Separate map from Meta's because the vocabularies differ and forcing one
 * shared name on both would mean picking a loser. Where GA4 has a
 * recommended ecommerce event we use it — Google Ads reads those natively
 * for bidding and audience building — and where it does not, the PostHog
 * name carries over so all three systems stay legible side by side.
 *
 * Why GA4 needs this at all: it previously saw only `page_view`,
 * `purchase` and `book_generated`, so a Google Ads audience could express
 * "visited and did not buy" but not "started an order and abandoned it".
 */
const GA4_FUNNEL_MAP: Partial<Record<FunnelEventName, string>> = {
  order_started: 'order_started',
  preview_paywall_viewed: 'add_to_cart',
  checkout_submit_clicked: 'begin_checkout',
};

/**
 * Mirror a funnel event to the ad platforms when the maps have a row.
 *
 * `properties` is deliberately NOT forwarded to either. Funnel events
 * carry `problemId`, and every problem on this site describes a child's
 * behavioural or health difficulty — special-category data under RODO
 * art. 9 that must never reach an advertising platform. See the note at
 * the top of `metaPixel.ts`. Section 8 of the privacy policy states this
 * to users as a commitment and names no platform, so it binds Google
 * exactly as it binds Meta.
 */
function mirrorToAdPlatforms(name: FunnelEventName): void {
  const meta = META_FUNNEL_MAP[name];
  if (meta) {
    const params = { content_type: 'product' };
    if ('standard' in meta) trackMetaStandard(meta.standard, params);
    else trackMetaCustom(meta.custom, params);
  }

  const ga4 = GA4_FUNNEL_MAP[name];
  if (ga4) trackGaFunnelEvent(ga4);
}

/**
 * Fire a PostHog event without going through the React hook plumbing.
 * Safe before opt-in and safe during SSR — both branches no-op silently.
 *
 * Use this from event handlers, useEffect mount hooks, or anywhere you
 * don't already have a PostHog instance from `useAnalytics()`. When you
 * already have a hook context (rendering body), prefer `useAnalytics`.
 *
 * Also mirrors the event to Meta and GA4 when the funnel maps have a row
 * for it. The mirror runs BEFORE the PostHog readiness guard: the SDKs
 * load independently, and a slow PostHog must not silently cost us an ad
 * audience membership.
 */
export function trackEvent(name: FunnelEventName, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  mirrorToAdPlatforms(name);
  // posthog-js exposes `__loaded` only after init(); reading capture before
  // init() throws. The singleton is initialised in entry.client.tsx.
  const ph = posthog as unknown as { __loaded?: boolean; capture?: typeof posthog.capture };
  if (!ph.__loaded || typeof ph.capture !== 'function') {
    return;
  }
  try {
    ph.capture(name, properties);
  } catch {
    // Telemetry must never break product flows.
  }
}

/**
 * Attach a "super property" that will be merged into every subsequent
 * capture from this device. Used to stamp `bookOrderId` on a funnel run
 * once an order has been created — see spec section 7.1.
 */
export function setFunnelSuperProperties(props: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const ph = posthog as unknown as {
    __loaded?: boolean;
    register?: (p: Record<string, unknown>) => void;
  };
  if (!ph.__loaded || typeof ph.register !== 'function') return;
  try {
    ph.register(props);
  } catch {
    // ignore
  }
}

/**
 * Hook helper for OrderWizard step transitions.
 *
 * Fires `order_form_step_viewed` when `step` changes (and on mount), and
 * `order_form_step_completed` for the *previous* step with a `durationMs`
 * delta. The last step also fires `_completed` on unmount.
 */
export function useStepTransitionTracker(
  step: number | string,
  extra: Record<string, unknown> = {},
): void {
  const stepRef = useRef<number | string | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    const previous = stepRef.current;
    const now = Date.now();
    if (previous !== null && previous !== step) {
      trackEvent('order_form_step_completed', {
        ...extra,
        step: previous,
        durationMs: now - startedAtRef.current,
      });
    }
    if (previous !== step) {
      trackEvent('order_form_step_viewed', { ...extra, step });
      stepRef.current = step;
      startedAtRef.current = now;
    }
    // Intentionally omit `extra` from deps — callers pass fresh objects
    // and we want the effect to fire only on `step` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    // On unmount, complete the current step.
    return () => {
      if (stepRef.current !== null) {
        trackEvent('order_form_step_completed', {
          ...extra,
          step: stepRef.current,
          durationMs: Date.now() - startedAtRef.current,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Scroll milestones reported by `useLpEngagement`, in percent of page height. */
const SCROLL_DEPTH_MILESTONES = [25, 50, 75, 100] as const;

/**
 * Landing-page engagement tracking: which sections a visitor actually reached
 * and how far down the page they scrolled. Both are the missing middle of the
 * funnel — without them a bounce and a visitor who read to the pricing table
 * look identical.
 *
 * Sections are discovered from `[data-lp-section]` (set by `Section`), so
 * adding a section to a page is enough to get it tracked. Every milestone and
 * every section fires at most once per page view.
 */
export function useLpEngagement(props: Record<string, unknown> = {}): void {
  // Props are read inside listeners that must not be re-bound on every render.
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const seenSections = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const name = entry.target.getAttribute('data-lp-section');
          if (!name || seenSections.has(name)) continue;
          seenSections.add(name);
          trackEvent('lp_section_viewed', { ...propsRef.current, section: name });
        }
      },
      // Half the section on screen — enough to count as "seen", not so much
      // that tall sections never qualify on a phone.
      { threshold: 0.5 },
    );
    for (const el of document.querySelectorAll('[data-lp-section]')) observer.observe(el);

    const seenDepths = new Set<number>();
    // The app shell scrolls `<main class="overflow-auto">`, not the window, so
    // `window.scrollY` stays 0 and window scroll events never fire. Listening
    // on document in the capture phase catches both cases: scroll events don't
    // bubble, but they do propagate downward to the capture listener.
    const onScroll = (event: Event) => {
      const target = event.target;
      let scrolled: number;
      let viewport: number;
      let total: number;

      if (target === document || target === document.documentElement || target === document.body) {
        scrolled = window.scrollY;
        viewport = window.innerHeight;
        total = document.documentElement.scrollHeight;
      } else if (target instanceof HTMLElement) {
        scrolled = target.scrollTop;
        viewport = target.clientHeight;
        total = target.scrollHeight;
      } else {
        return;
      }

      // Nothing to scroll — reporting 100% here would mark every visitor as
      // having read the whole page.
      if (total - viewport <= 0) return;

      const percent = ((scrolled + viewport) / total) * 100;
      for (const milestone of SCROLL_DEPTH_MILESTONES) {
        if (percent >= milestone && !seenDepths.has(milestone)) {
          seenDepths.add(milestone);
          trackEvent('lp_scroll_depth', { ...propsRef.current, percent: milestone });
        }
      }
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });

    return () => {
      observer.disconnect();
      document.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, []);
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
