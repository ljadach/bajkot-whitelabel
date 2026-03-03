import { Navigate, useLocation } from 'react-router';

/** Catch-all within /:lang/* — redirect to lang home */
export default function LangCatchall() {
  const { pathname } = useLocation();
  const lang = pathname.match(/^\/(en|pl|de)(\/|$)/)?.[1] ?? 'en';
  return <Navigate to={`/${lang}/`} replace />;
}
