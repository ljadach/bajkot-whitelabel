import type { MetaDescriptor, MetaFunction } from 'react-router';
import { CennikPage } from '../pages/CennikPage';

const SITE_URL = 'https://bajkoterapia.org';

export const meta: MetaFunction = (): MetaDescriptor[] => {
  const title = 'Cennik — Bajkoterapia | Spersonalizowane bajki terapeutyczne';
  const description =
    'Sprawdź, ile kosztuje spersonalizowana bajka terapeutyczna. PDF od 29 zł, drukowana książka od 49 zł. Bez ukrytych opłat, gwarancja zwrotu 14 dni.';
  const canonicalUrl = `${SITE_URL}/cennik`;

  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:locale', content: 'pl_PL' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { tagName: 'link', rel: 'canonical', href: canonicalUrl },
  ];
};

export default function Cennik() {
  return <CennikPage />;
}
