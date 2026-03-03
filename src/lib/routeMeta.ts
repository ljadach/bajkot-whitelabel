import i18n from 'i18next';
import type { MetaDescriptor } from 'react-router';

const SITE_URL = 'https://aitutoro.com';
const LOCALE_MAP: Record<string, string> = { en: 'en_US', pl: 'pl_PL', de: 'de_DE' };
const LANGS = ['en', 'pl', 'de'] as const;

export function extractLang(pathname: string): string {
  return pathname.match(/^\/(en|pl|de)(\/|$)/)?.[1] ?? 'en';
}

/**
 * Build the standard meta descriptor array for a marketing page.
 *
 * Uses i18n.getFixedT so it works regardless of the current i18n.language
 * (important for SSR where <Meta/> renders before LangLayout sets the lang).
 */
export function buildPageMeta({
  pathname,
  ns,
  routePath,
}: {
  pathname: string;
  /** i18n namespace for this page (e.g. 'pricing', 'product-claude') */
  ns: string;
  /** Path relative to the lang prefix (e.g. '/pricing', '/ai-tools/claude') */
  routePath: string;
}): MetaDescriptor[] {
  const lang = extractLang(pathname);
  const t = i18n.getFixedT(lang, ns);

  const title = t('meta.title');
  const description = t('meta.description');
  const canonicalUrl = `${SITE_URL}/${lang}${routePath}`;
  const ogLocale = LOCALE_MAP[lang] ?? 'en_US';

  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:locale', content: ogLocale },
    ...LANGS.filter((l) => l !== lang).map((l) => ({
      property: 'og:locale:alternate' as const,
      content: LOCALE_MAP[l] ?? 'en_US',
    })),
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { tagName: 'link', rel: 'canonical', href: canonicalUrl },
    // Hreflang alternates
    ...LANGS.map((l) => ({
      tagName: 'link' as const,
      rel: 'alternate',
      hreflang: l,
      href: `${SITE_URL}/${l}${routePath}`,
    })),
    {
      tagName: 'link',
      rel: 'alternate',
      hreflang: 'x-default',
      href: `${SITE_URL}/en${routePath}`,
    },
  ];
}
