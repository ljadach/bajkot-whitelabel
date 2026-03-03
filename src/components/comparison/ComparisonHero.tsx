import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { proseComponents } from '@/lib/markdownComponents';

interface ComparisonHeroProps {
  namespace: string;
}

export function ComparisonHero({ namespace }: ComparisonHeroProps) {
  const { t } = useTranslation(namespace);
  const { t: tc } = useTranslation('compare-common');

  return (
    <header className="mb-10">
      <h1 className="text-hero font-bold leading-[1.2] tracking-tight text-neutral-900 mb-4">{t('hero.title')}</h1>
      <div className="prose-enterprise mb-4">
        <ReactMarkdown components={proseComponents}>{t('hero.intro')}</ReactMarkdown>
      </div>
      <span className="comparison-date-badge">
        {tc('dateBadge.prefix')} {t('lastUpdated')}
      </span>
    </header>
  );
}
