import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { scrollAppToTop } from '../lib/appScroll';

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
    scrollAppToTop();
  }, [pathname]);
  return null;
}
