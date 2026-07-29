/**
 * PostHog Configuration
 *
 * Central configuration for PostHog analytics and feature flags.
 * Modify these settings to control tracking behavior.
 */

export const posthogConfig = {
  // API Configuration
  // Events go through our reverse proxy (vercel.json rewrites /ingest/* →
  // eu.i.posthog.com) so ad-blockers don't eat them; ui_host points the SDK
  // back at the real PostHog app for toolbar/links.
  apiKey: import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined,
  apiHost: (import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string) || '/ingest',
  uiHost: 'https://eu.posthog.com',

  // SDK defaults version
  defaults: '2025-05-30' as const,

  // Tracking Settings
  autocapture: true, // Automatically capture clicks, form submissions, etc.
  capturePageview: true, // Automatically capture page views
  capturePageleave: true, // Capture when user leaves the page

  // Session Recording
  sessionRecording: {
    maskAllInputs: true, // Mask all input values for privacy
    maskTextSelector: '[data-private]', // Custom selector for masking
  },
  disableSessionRecording: false,

  // Persistence
  persistence: 'localStorage+cookie' as const,

  // Privacy / Consent
  optOutCapturingByDefault: true, // Require cookie consent before tracking

  // Feature Flags
  featureFlagRequestTimeoutMs: 3000,

  // Advanced
  disableDecide: false, // Enable feature flags and session recording
};

/**
 * Get the full PostHog initialization options
 */
export function getPostHogOptions() {
  return {
    api_host: posthogConfig.apiHost,
    ui_host: posthogConfig.uiHost,
    defaults: posthogConfig.defaults,
    autocapture: posthogConfig.autocapture,
    capture_pageview: posthogConfig.capturePageview,
    capture_pageleave: posthogConfig.capturePageleave,
    session_recording: posthogConfig.sessionRecording,
    disable_session_recording: posthogConfig.disableSessionRecording,
    persistence: posthogConfig.persistence,
    opt_out_capturing_by_default: posthogConfig.optOutCapturingByDefault,
    feature_flag_request_timeout_ms: posthogConfig.featureFlagRequestTimeoutMs,
  };
}
