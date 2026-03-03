import { Navigate, useLocation } from 'react-router';
import { isSupported, detectBrowserLanguage } from '@/locales';

/** Redirects old non-prefixed URLs (e.g., /business, /pricing) to /:lang/path */
export default function LegacyRedirect() {
  const { pathname } = useLocation();
  const stored = typeof window !== 'undefined' ? localStorage.getItem('preferredLanguage') : null;
  const lang = stored && isSupported(stored) ? stored : detectBrowserLanguage();
  return <Navigate to={`/${lang}${pathname}`} replace />;
}
