import { Navigate } from 'react-router';
import { isSupported, detectBrowserLanguage } from '@/locales';

/** Redirects bare "/" to "/:lang/" based on stored preference or browser detection */
export default function LanguageRedirect() {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('preferredLanguage') : null;
  const lang = stored && isSupported(stored) ? stored : detectBrowserLanguage();
  return <Navigate to={`/${lang}/`} replace />;
}
