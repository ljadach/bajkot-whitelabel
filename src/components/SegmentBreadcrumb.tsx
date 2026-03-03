import { useLocation } from 'react-router';
import i18n from 'i18next';
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb';
import { segmentBySlug } from '../pages/segmentConfig';
import { getProductConfig } from '../pages/productConfig';
import { getComparisonConfig } from '../pages/comparisonConfig';
import { useLangFromUrl } from '../hooks/useLangFromUrl';

function getBreadcrumbItems(slug: string, lang: string): BreadcrumbItem[] | null {
  const home: BreadcrumbItem = { label: 'AITutoro', href: `/${lang}/` };
  const aiTools: BreadcrumbItem = {
    label: i18n.t('breadcrumbs.aiTools', { ns: 'compare-common' }),
    href: `/${lang}/ai-tools`,
  };

  if (slug === 'pricing') {
    return [home, { label: i18n.t('breadcrumb', { ns: 'pricing' }) }];
  }
  if (slug === 'support/faq') {
    return [home, { label: i18n.t('supportBreadcrumb', { ns: 'faq' }) }, { label: i18n.t('breadcrumb', { ns: 'faq' }) }];
  }
  if (slug === 'about/contact') {
    return [home, { label: i18n.t('aboutBreadcrumb', { ns: 'contact' }) }, { label: i18n.t('breadcrumb', { ns: 'contact' }) }];
  }
  if (slug === 'ai-tools') {
    return [home, { label: i18n.t('breadcrumbs.aiTools', { ns: 'compare-common' }) }];
  }
  if (slug === 'ai-tools/glossary') {
    return [home, aiTools, { label: i18n.t('breadcrumb', { ns: 'glossary' }) }];
  }

  const productMatch = slug.match(/^ai-tools\/(.+)$/);
  if (productMatch && !slug.startsWith('ai-tools/compare')) {
    const prodConfig = getProductConfig(productMatch[1]);
    if (!prodConfig) return null;
    return [home, aiTools, { label: prodConfig.toolName }];
  }

  if (slug === 'ai-tools/compare') {
    return [home, aiTools, { label: i18n.t('breadcrumbs.comparisons', { ns: 'compare-common' }) }];
  }

  const compMatch = slug.match(/^ai-tools\/compare\/(.+)$/);

  if (compMatch) {
    const compConfig = getComparisonConfig(compMatch[1]);
    if (!compConfig) return null;
    return [
      home,
      aiTools,
      {
        label: i18n.t('breadcrumbs.comparisons', { ns: 'compare-common' }),
        href: `/${lang}/ai-tools/compare`,
      },
      { label: i18n.t('hero.title', { ns: compConfig.namespace }) },
    ];
  }

  const segment = segmentBySlug(slug);
  if (segment) {
    const ns = `segment-${segment}`;
    const isIndividualsSubPage = slug.startsWith('ai-for-individuals/');
    if (isIndividualsSubPage) {
      return [
        home,
        {
          label: i18n.t('breadcrumb', { ns: 'segment-individuals' }),
          href: `/${lang}/ai-for-individuals`,
        },
        { label: i18n.t('breadcrumb', { ns }) },
      ];
    }
    return [home, { label: i18n.t('breadcrumb', { ns }) }];
  }

  return null;
}

export function SegmentBreadcrumb() {
  const { pathname } = useLocation();
  const lang = useLangFromUrl();
  const slug = pathname.replace(/^\/(en|pl|de)\//, '');
  const items = getBreadcrumbItems(slug, lang);
  if (!items) return null;
  return <Breadcrumb items={items} />;
}
