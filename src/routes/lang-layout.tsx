import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';

/** Layout wrapper for language-prefixed public routes. Syncs URL lang to i18n. */
export default function LangLayout() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();

  // Extract lang from URL path — works in both SSR and client
  const routeLang = pathname.match(/^\/(en|pl|de)(\/|$)/)?.[1] ?? 'en';

  // Synchronously set language before render so SSR gets correct translations
  if (i18n.language !== routeLang) {
    void i18n.changeLanguage(routeLang);
  }

  useEffect(() => {
    localStorage.setItem('preferredLanguage', routeLang);
    document.documentElement.lang = routeLang;
    return () => {
      document.documentElement.lang = 'en';
    };
  }, [routeLang]);

  return <Outlet />;
}
