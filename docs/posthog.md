# PostHog Analytics & Feature Flags

This document describes how to use PostHog for analytics tracking and feature flags in the AITutor application.

## Setup

PostHog is initialized in `src/main.tsx` with the `PostHogProvider`. Configuration is done via environment variables:

```env
VITE_PUBLIC_POSTHOG_KEY=phc_your_project_key
VITE_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

**Important:** Never import `posthog-js` directly in components. Always use the hooks from `@lib/telemetry`.

## Analytics

### Basic Event Tracking

Use the `useAnalytics` hook to track events:

```tsx
import { useAnalytics, generateProfileHash } from '@lib/telemetry';

function MyComponent() {
  const { track, getSessionId, identify, isEnabled } = useAnalytics();

  const handleClick = () => {
    track('button_clicked', {
      session_id: getSessionId(),
      button_name: 'submit',
      profile_hash: generateProfileHash(profileData),
    });
  };

  return <button onClick={handleClick}>Submit</button>;
}
```

### Available Event Types

```typescript
type TelemetryEvent =
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
```

### User Identification

Identify users at key moments (e.g., after login or at checkout):

```tsx
const { identify, setPersonProperties, group } = useAnalytics();

// Identify user
identify('user-123', {
  email: 'user@example.com',
  plan: 'pro',
});

// Set additional person properties
setPersonProperties({
  last_purchase: new Date().toISOString(),
});

// Group user (for B2B analytics)
group('company', 'company-456', {
  name: 'Acme Corp',
  industry: 'tech',
});
```

### Page View Tracking

Since autocapture is disabled, use the `usePageView` hook for manual page tracking:

```tsx
import { usePageView } from '@lib/telemetry';

function MyPage() {
  usePageView('dashboard', { section: 'overview' });

  return <div>Dashboard content</div>;
}
```

## Consent Management

The `useConsent` hook manages cookie consent and analytics opt-in/out:

```tsx
import { useConsent } from '@lib/telemetry';

function CookieBanner() {
  const {
    consentStatus,      // 'accepted' | 'rejected' | 'custom' | null
    isAnalyticsEnabled, // boolean
    acceptAll,          // () => void
    rejectAll,          // () => void
    setCustomConsent,   // (analytics: boolean) => void
  } = useConsent();

  if (consentStatus) return null; // Already has consent

  return (
    <div>
      <button onClick={acceptAll}>Accept</button>
      <button onClick={rejectAll}>Reject</button>
    </div>
  );
}
```

## Feature Flags

### Boolean Flags

Use `useFeatureFlag` to check if a feature is enabled:

```tsx
import { useFeatureFlag } from '@lib/telemetry';

function MyComponent() {
  const showNewFeature = useFeatureFlag('new-checkout-flow');

  if (showNewFeature) {
    return <NewCheckoutFlow />;
  }
  return <OldCheckoutFlow />;
}
```

### Multivariate Flags

Use `useFeatureFlagVariant` for A/B tests with multiple variants:

```tsx
import { useFeatureFlagVariant } from '@lib/telemetry';

function Button() {
  const variant = useFeatureFlagVariant('button-color-experiment');

  if (variant === 'blue') return <BlueButton />;
  if (variant === 'green') return <GreenButton />;
  return <DefaultButton />;
}
```

### Flag Payloads

Use `useFeatureFlagWithPayload` to get both enabled status and payload:

```tsx
import { useFeatureFlagWithPayload } from '@lib/telemetry';

interface PromoPayload {
  title: string;
  discount: number;
}

function PromoBanner() {
  const { enabled, payload } = useFeatureFlagWithPayload<PromoPayload>('promo-banner');

  if (!enabled || !payload) return null;

  return (
    <div>
      <h2>{payload.title}</h2>
      <p>Get {payload.discount}% off!</p>
    </div>
  );
}
```

**Note:** The payload hook alone does NOT send a `$feature_flag_called` event. Always use it with `useFeatureFlag` or `useFeatureFlagVariant` to ensure experiments are tracked.

### PostHogFeature Component

For simpler cases, use the `PostHogFeature` component:

```tsx
import { PostHogFeature } from '@lib/telemetry';

function App() {
  return (
    <PostHogFeature flag="show-welcome-message" match={true}>
      <WelcomeMessage />
    </PostHogFeature>
  );
}
```

With payload:

```tsx
<PostHogFeature flag="promo-banner" match={true}>
  {(payload) => (
    <div>
      <h2>{payload.title}</h2>
      <p>{payload.description}</p>
    </div>
  )}
</PostHogFeature>
```

With fallback:

```tsx
<PostHogFeature
  flag="new-feature"
  match={true}
  fallback={<OldFeature />}
>
  <NewFeature />
</PostHogFeature>
```

### Visibility Tracking

Use `PostHogCaptureOnViewed` to track when elements scroll into view:

```tsx
import { PostHogCaptureOnViewed } from '@lib/telemetry';

function ProductGallery() {
  return (
    <PostHogCaptureOnViewed
      name="product-gallery"
      properties={{ category: 'featured' }}
    >
      <div>Gallery content</div>
    </PostHogCaptureOnViewed>
  );
}
```

Track multiple children separately:

```tsx
<PostHogCaptureOnViewed
  name="product-cards"
  properties={{ gallery_type: 'featured' }}
  trackAllChildren
>
  <ProductCard id="1" />
  <ProductCard id="2" />
  <ProductCard id="3" />
</PostHogCaptureOnViewed>
```

## Best Practices

### 1. Always use hooks

```tsx
// Good
const { track } = useAnalytics();
track('my_event', { data: 'value' });

// Bad - don't import posthog directly
import posthog from 'posthog-js';
posthog.capture('my_event'); // May fail if not initialized
```

### 2. Use optional chaining

PostHog may not be initialized in some environments:

```tsx
const { track, posthog } = useAnalytics();

// The hooks handle this internally, but if accessing posthog directly:
posthog?.capture('event');
```

### 3. Anonymize sensitive data

Use `generateProfileHash` for profile data:

```tsx
import { generateProfileHash } from '@lib/telemetry';

track('event', {
  profile_hash: generateProfileHash(userProfile), // Good
  // email: user.email, // Bad - PII should not be in events
});
```

### 4. Include session context

Always include `session_id` for session-level analysis:

```tsx
track('my_event', {
  session_id: getSessionId(),
  step: 'chat',
  // ...other properties
});
```

### 5. Feature flag naming conventions

- Use kebab-case: `new-checkout-flow`
- Be descriptive: `promo-banner-summer-2024`
- Prefix experiments: `experiment-button-color`

## Configuration Options

PostHog is configured in `src/main.tsx`:

```typescript
posthog.init(posthogKey, {
  api_host: posthogHost,
  defaults: '2025-05-30',
  session_recording: {
    maskAllInputs: true,           // Mask all inputs for privacy
    maskTextSelector: '[data-private]', // Custom masking selector
  },
  disable_session_recording: false,
  autocapture: false,              // Manual tracking only
  capture_pageview: false,         // Manual page view tracking
  persistence: 'localStorage+cookie',
  opt_out_capturing_by_default: true, // Wait for consent
  feature_flag_request_timeout_ms: 3000,
});
```

## Troubleshooting

### TypeError: Cannot read properties of undefined

This error occurs when calling PostHog methods before initialization. Solution: always use optional chaining or check if posthog exists:

```tsx
const { posthog } = useAnalytics();

useEffect(() => {
  posthog?.capture('test'); // Safe with optional chaining
}, [posthog]);
```

### Feature flags not loading

1. Check that the PostHog API key is correct
2. Verify the host URL is accessible
3. Check browser console for network errors
4. Ensure user has opted in to tracking (for some flag configurations)

### Events not appearing in PostHog

1. Verify consent has been given (`useConsent().isAnalyticsEnabled`)
2. Check browser network tab for PostHog requests
3. Events may take a few minutes to appear in the dashboard
