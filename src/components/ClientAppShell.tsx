/**
 * Client-only app shell components.
 * This module imports browser-only packages (Clerk, Convex, PostHog)
 * and should ONLY be loaded via React.lazy() — never during SSR.
 */
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { UserButton, useUser } from '@clerk/clerk-react';
import { Authenticated, Unauthenticated } from 'convex/react';
import { useTranslation } from 'react-i18next';

import { useConsent, useAnalytics } from '../lib/telemetry';
import { PostHogPageviewTracker } from './PostHogPageviewTracker';
import { CookieBanner } from './CookieBanner';
import { PublicNavMenu } from './PublicNavMenu';
import { SignInModal } from './SignInModal';

/** Auth-dependent header actions — replaces the ClientOnly fallback in Header */
export function HeaderActions() {
  return (
    <>
      <Authenticated>
        <AuthenticatedActions />
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedActions />
      </Unauthenticated>
    </>
  );
}

function AuthenticatedActions() {
  // While the user is already inside the book-order wizard / pipeline, a
  // second "Stwórz bajkę" CTA in the header is just noise — hide it.
  const { pathname } = useLocation();
  const inBookFlow = pathname.startsWith('/book/');

  return (
    <div className="flex items-center gap-2">
      <Link
        to="/dashboard"
        className="text-sm font-medium text-neutral-700 hover:text-neutral-900 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
      >
        Panel
      </Link>
      {!inBookFlow && (
        <Link
          to="/book/order"
          className="text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 px-3 py-1.5 rounded-lg transition-colors"
        >
          Stwórz bajkę
        </Link>
      )}
      <UserButton
        appearance={{
          elements: {
            avatarBox: 'w-8 h-8',
            userButtonTrigger: 'focus:shadow-none',
          },
        }}
      />
    </div>
  );
}

function UnauthenticatedActions() {
  return (
    <div className="flex items-center gap-1">
      <LoginButton />
      <PublicNavMenu />
    </div>
  );
}

function LoginButton() {
  const { t } = useTranslation('common');
  const [showSignIn, setShowSignIn] = useState(false);
  return (
    <>
      <button
        onClick={() => setShowSignIn(true)}
        className="text-sm font-medium text-neutral-700 hover:text-neutral-900 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
      >
        {t('logIn', 'Log in')}
      </button>
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </>
  );
}

/** Client-only utilities that run in the background */
export function ClientUtilities() {
  return (
    <>
      <PostHogPageviewTracker />
      <AnalyticsBodyClass />
      <CookieBanner />
    </>
  );
}

function AnalyticsBodyClass() {
  const { isAnalyticsEnabled } = useConsent();
  useEffect(() => {
    if (isAnalyticsEnabled) {
      document.body.classList.add('analytics-enabled');
    } else {
      document.body.classList.remove('analytics-enabled');
    }
  }, [isAnalyticsEnabled]);
  return null;
}

/** Identifies user in PostHog after Clerk authentication */
export function UserIdentification() {
  const { user, isLoaded } = useUser();
  const { identify } = useAnalytics();
  const hasIdentified = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user?.id || hasIdentified.current) return;
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) return;
    identify(user.id, { email, name: user.fullName || undefined });
    hasIdentified.current = true;
  }, [isLoaded, user?.id, user?.primaryEmailAddress?.emailAddress, user?.fullName, identify]);

  return null;
}
