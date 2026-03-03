import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';

interface RelatedItem {
  slug: string;
  label: string;
  type?: 'comparison' | 'product';
}

interface RelatedComparisonsProps {
  namespace: string;
}

export function RelatedComparisons({ namespace }: RelatedComparisonsProps) {
  const { t } = useTranslation(namespace);
  const { t: tc } = useTranslation('compare-common');
  const location = useLocation();

  const langMatch = location.pathname.match(/^\/(en|pl|de)(\/|$)/);
  const lang = langMatch ? langMatch[1] : 'en';

  const related = t('related', { returnObjects: true }) as RelatedItem[];
  const relatedArr = Array.isArray(related) ? related : [];

  if (relatedArr.length === 0) return null;

  return (
    <section className="comparison-section">
      <h2 className="text-2xl font-semibold text-neutral-900 mb-4 tracking-tight">{tc('related.title')}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible">
        {relatedArr.map((item) => {
          const to = item.type === 'product' ? `/${lang}/ai-tools/${item.slug}` : `/${lang}/ai-tools/compare/${item.slug}`;
          return (
            <Link key={item.slug} to={to} className="flex-shrink-0 usecase-card min-w-[200px] lg:min-w-0 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <span className="font-semibold text-sm text-neutral-900">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
