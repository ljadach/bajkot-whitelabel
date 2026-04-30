/**
 * AdminAuthGate
 *
 * Guards admin routes (`/admin/*`) with three explicit states:
 *  1. Unauthenticated  — friendly screen with "Zaloguj się" button
 *     (opens Clerk SignIn modal, returns user to the same admin path).
 *  2. Authenticated, not admin — "Brak uprawnień" screen with sign-out fallback.
 *  3. Authenticated admin — renders children normally.
 *
 * Loading states (Convex auth, role query) render a centered spinner.
 *
 * Replaces the previous behaviour where unauthenticated users were silently
 * redirected to `/`, leaving them with no idea what happened.
 */
import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Authenticated, Unauthenticated, AuthLoading, useQuery } from 'convex/react';
import { SignOutButton } from '@clerk/clerk-react';
import { api } from '../../convex/_generated/api';
import { SignInModal } from '../components/SignInModal';

interface AdminAuthGateProps {
  children: ReactNode;
}

function CenterSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 spinner" />
    </div>
  );
}

function ScreenShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10 text-center">
        {children}
      </div>
    </div>
  );
}

function UnauthenticatedScreen() {
  const location = useLocation();
  const [showSignIn, setShowSignIn] = useState(false);
  // Preserve the path the user actually wanted so they land back here after sign-in.
  const redirectUrl = `${location.pathname}${location.search}${location.hash}`;

  return (
    <>
      <ScreenShell>
        <div className="w-16 h-16 bg-calm-100 text-calm-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-5">
          <i className="fa-solid fa-lock" />
        </div>
        <h1 className="text-2xl font-black text-calm-900 mb-3">Panel admina</h1>
        <p className="text-gray-500 font-medium text-sm md:text-base mb-7">
          Musisz być zalogowany, żeby tu wejść.
        </p>
        <button
          onClick={() => setShowSignIn(true)}
          className="w-full bg-magic-500 hover:bg-magic-600 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-magic-500/30 transition mb-4"
        >
          Zaloguj się
        </button>
        <Link
          to="/"
          className="text-sm text-gray-500 hover:text-gray-700 font-medium underline-offset-4 hover:underline"
        >
          Wróć na stronę główną
        </Link>
      </ScreenShell>
      {showSignIn && <SignInModal redirectUrl={redirectUrl} onClose={() => setShowSignIn(false)} />}
    </>
  );
}

function NotAdminScreen() {
  return (
    <ScreenShell>
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-5">
        <i className="fa-solid fa-circle-exclamation" />
      </div>
      <h1 className="text-2xl font-black text-calm-900 mb-3">Brak uprawnień</h1>
      <p className="text-gray-500 font-medium text-sm md:text-base mb-7">
        Twoje konto nie ma uprawnień admina. Skontaktuj się z zespołem.
      </p>
      <div className="flex flex-col items-center gap-3">
        <Link
          to="/"
          className="text-sm text-gray-700 hover:text-gray-900 font-semibold underline-offset-4 hover:underline"
        >
          Wróć na stronę główną
        </Link>
        <SignOutButton>
          <button
            type="button"
            className="text-xs text-gray-400 hover:text-gray-600 font-medium underline-offset-4 hover:underline"
          >
            Wyloguj
          </button>
        </SignOutButton>
      </div>
    </ScreenShell>
  );
}

/** Inner gate: user is authenticated, decide based on admin role. */
function AdminRoleGate({ children }: { children: ReactNode }) {
  const isAdminQuery = useQuery(api.auth.isAdmin);

  if (isAdminQuery === undefined) {
    return <CenterSpinner />;
  }

  if (!isAdminQuery) {
    return <NotAdminScreen />;
  }

  return <>{children}</>;
}

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  return (
    <>
      <AuthLoading>
        <CenterSpinner />
      </AuthLoading>
      <Authenticated>
        <AdminRoleGate>{children}</AdminRoleGate>
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedScreen />
      </Unauthenticated>
    </>
  );
}
