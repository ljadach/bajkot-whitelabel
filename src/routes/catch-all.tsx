import { Navigate } from 'react-router';
import { isSupported, detectBrowserLanguage } from '@/locales';

/** Global catch-all — redirects to language-prefixed home */
export default function CatchAll() {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('preferredLanguage') : null;
  const lang = stored && isSupported(stored) ? stored : detectBrowserLanguage();
  return <Navigate to={`/${lang}/`} replace />;
}
