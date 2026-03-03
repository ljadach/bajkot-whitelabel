import { useLocation } from 'react-router';

export type SupportedLang = 'en' | 'pl' | 'de';

export function useLangFromUrl(): SupportedLang {
  const { pathname } = useLocation();
  const match = pathname.match(/^\/(en|pl|de)(\/|$)/);
  return (match ? match[1] : 'en') as SupportedLang;
}
