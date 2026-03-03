import { lazy, Suspense } from 'react';
import type { MetaFunction } from 'react-router';
import { HomePage } from '../pages/HomePage';
import { buildPageMeta } from '../lib/routeMeta';
import { ClientOnly } from '../components/ClientOnly';

/** Auth-aware redirect — lazy-loaded to avoid importing convex/react during SSR */
const HomeAuthRedirect = lazy(() => import('./home-auth-redirect'));

export const meta: MetaFunction = ({ location }) => buildPageMeta({ pathname: location.pathname, ns: 'app', routePath: '/' });

/**
 * Home route: renders marketing page for SSR/unauthenticated.
 * After hydration, authenticated users get redirected to their latest step.
 */
export default function Home() {
  return (
    <>
      <ClientOnly>
        <Suspense fallback={null}>
          <HomeAuthRedirect />
        </Suspense>
      </ClientOnly>
      <HomePage />
    </>
  );
}
