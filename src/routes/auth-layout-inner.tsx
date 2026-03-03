import { Authenticated, Unauthenticated, useQuery } from 'convex/react';
import { Navigate, Outlet } from 'react-router';
import { api } from '../../convex/_generated/api';
import { UserIdentification, LanguageSyncOnLogin } from '../components/ClientAppShell';
import { isSupported, detectBrowserLanguage } from '@/locales';

function LanguageRedirect() {
  const stored = localStorage.getItem('preferredLanguage');
  const lang = stored && isSupported(stored) ? stored : detectBrowserLanguage();
  return <Navigate to={`/${lang}/`} replace />;
}

function AuthenticatedContent() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-6 h-6 spinner" />
      </div>
    );
  }

  return (
    <>
      <LanguageSyncOnLogin />
      <UserIdentification />
      <Outlet />
    </>
  );
}

/** Auth-gated content — redirects unauthenticated users */
export default function AuthLayoutInner() {
  return (
    <>
      <Authenticated>
        <AuthenticatedContent />
      </Authenticated>
      <Unauthenticated>
        <LanguageRedirect />
      </Unauthenticated>
    </>
  );
}
