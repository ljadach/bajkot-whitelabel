import type { MetaFunction } from 'react-router';
import { LegalPage } from '../pages/LegalPage';
import { TERMS_DOC } from '../data/legalDocs';

const SITE_URL = 'https://bajkoterapia.org';

export const meta: MetaFunction = () => {
  const title = 'Regulamin serwisu — Bajkoterapia';
  const description =
    'Regulamin serwisu Bajkoterapia.org. Warunki sprzedaży personalizowanych bajek dla dzieci w formacie PDF oraz drukowanym.';
  const canonical = `${SITE_URL}/regulamin`;
  return [
    { title },
    { name: 'description', content: description },
    { name: 'robots', content: 'index, follow' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonical },
    { property: 'og:locale', content: 'pl_PL' },
    { tagName: 'link', rel: 'canonical', href: canonical },
  ];
};

export default function Regulamin() {
  return <LegalPage doc={TERMS_DOC} />;
}
