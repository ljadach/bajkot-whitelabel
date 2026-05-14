import type { MetaFunction } from 'react-router';
import { LegalPage } from '../pages/LegalPage';
import { PRIVACY_DOC } from '../data/legalDocs';

const SITE_URL = 'https://bajkoterapia.org';

export const meta: MetaFunction = () => {
  const title = 'Polityka Prywatności — Bajkoterapia';
  const description =
    'Polityka prywatności serwisu Bajkoterapia.org. Jakie dane zbieramy, w jakim celu i jakie prawa przysługują rodzicom oraz dzieciom.';
  const canonical = `${SITE_URL}/polityka-prywatnosci`;
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

export default function PolitykaPrywatnosci() {
  return <LegalPage doc={PRIVACY_DOC} />;
}
