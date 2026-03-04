import i18n from 'i18next';
import type { MetaDescriptor } from 'react-router';

const SITE_URL = 'https://bajkot.pl';

export function buildPageMeta({
  ns,
  routePath,
}: {
  ns: string;
  routePath: string;
}): MetaDescriptor[] {
  const t = i18n.getFixedT('pl', ns);

  const title = t('meta.title');
  const description = t('meta.description');
  const canonicalUrl = `${SITE_URL}/pl${routePath}`;

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
}
