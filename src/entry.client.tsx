import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';
import './lib/i18n';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import posthog from 'posthog-js';
import { PostHogProvider } from '@posthog/react';
import { posthogConfig, getPostHogOptions } from '@lib/posthogConfig';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (posthogConfig.apiKey) {
  posthog.init(posthogConfig.apiKey, getPostHogOptions());
}

if (!clerkPublishableKey) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set in .env.local');
}

function App() {
  return (
    <PostHogProvider client={posthog}>
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <HydratedRouter />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </PostHogProvider>
  );
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
