/**
 * Client-only app shell components.
 * This module imports browser-only packages (Clerk, Convex, PostHog)
 * and should ONLY be loaded via React.lazy() — never during SSR.
 */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { UserButton, useUser } from '@clerk/clerk-react';
import { Authenticated, Unauthenticated } from 'convex/react';
import { useTranslation } from 'react-i18next';

import { useConsent, useAnalytics } from '../lib/telemetry';
import { PointsDisplay } from './course/PointsDisplay';
import { PostHogPageviewTracker } from './PostHogPageviewTracker';
import { CookieBanner } from './CookieBanner';
import { DebugRoot } from './debug';
import { LanguageSwitcher } from './LanguageSwitcher';
import { PublicNavMenu } from './PublicNavMenu';
import { SignInModal } from './SignInModal';
import { useLanguageSync } from '../hooks/useLanguageSync';

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
  return (
    <div className="flex items-center gap-2">
      <LanguageSwitcher compact />
      <PointsDisplay />
      <Link to="/dashboard" className="p-2 rounded-lg text-orange-500 hover:text-orange-600 hover:bg-orange-50 transition-colors" title="Dashboard">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
      </Link>
      <Link to="/settings" className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors" title="Settings">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </Link>
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
      <LanguageSwitcher compact />
      <LoginButton />
      <PublicNavMenu />
    </div>
  );
}

function LoginButton() {
  const { t } = useTranslation('segment-common');
  const [showSignIn, setShowSignIn] = useState(false);
  return (
    <>
      <button onClick={() => setShowSignIn(true)} className="text-sm font-medium text-neutral-700 hover:text-neutral-900 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
        {t('nav.login', 'Log in')}
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

/** Debug panel — only for authenticated users */
export function AuthDebugPanel() {
  return (
    <Authenticated>
      <DebugRoot />
    </Authenticated>
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

/** Syncs localStorage language preference to profile after authentication */
export function LanguageSyncOnLogin() {
  useLanguageSync();
  return null;
}
