import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router';
import { isSupported, detectBrowserLanguage } from '@/locales';
import { ClientOnly } from '../components/ClientOnly';

/** Client-only auth redirect — lazy-loaded to avoid convex/react in SSR */
const CatchAllAuth = lazy(() => import('./catch-all-auth'));

function LanguageRedirect() {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('preferredLanguage') : null;
  const lang = stored && isSupported(stored) ? stored : detectBrowserLanguage();
  return <Navigate to={`/${lang}/`} replace />;
}

/** Global catch-all — during SSR redirects to lang home, client checks auth first */
export default function CatchAll() {
  return (
    <>
      <ClientOnly>
        <Suspense fallback={null}>
          <CatchAllAuth />
        </Suspense>
      </ClientOnly>
      <LanguageRedirect />
    </>
  );
}
