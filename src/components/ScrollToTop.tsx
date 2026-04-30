import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * The app shell wraps `<Outlet />` in a scrollable `<main>`, so React Router's
 * default `<ScrollRestoration />` (which only manages window scroll) has nothing
 * to do. Without this component the scroll position is preserved when
 * navigating between pages — e.g. clicking a topic in the catalog dropped the
 * user halfway down the landing page.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}
