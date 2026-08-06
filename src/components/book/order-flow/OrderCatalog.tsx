import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CATALOG_CATEGORIES, type Topic, topicsByCategory } from '../../../data/topics';
import { trackEvent } from '../../../lib/telemetry';
import type { CatalogTab, SelectedTopic } from './types';

interface Props {
  onSelect: (topic: SelectedTopic) => void;
}

/**
 * Catalog grid with category tabs (auth flow only).
 * Mirrors `#screen-catalog` from docs/protos_v2/Bajkoterapia-Nowy-Flow.html.
 */
export function OrderCatalog({ onSelect }: Props) {
  const { t } = useTranslation('book');
  const [tab, setTab] = useState<CatalogTab>('all');

  const filtered = useMemo(() => {
    if (tab === 'all') return topicsByCategory('all');
    return topicsByCategory(tab);
  }, [tab]);

  const handleSelect = useCallback(
    (topic: SelectedTopic) => {
      trackEvent('topic_selected', {
        flow: 'auth',
        problemId: topic.slug,
        trigger: 'user_choice',
      });
      onSelect(topic);
    },
    [onSelect],
  );

  return (
    <section className="pt-28 pb-20 px-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-magic-500 font-bold uppercase tracking-widest text-sm mb-2 block">
            {t('catalog.kicker')}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-calm-900 mb-4">
            {t('catalog.heading')}
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">{t('catalog.subheading')}</p>
        </div>

        {/* Tab filter buttons */}
        <div
          className="flex gap-3 overflow-x-auto pb-4 mb-8 px-2"
          style={{ scrollbarWidth: 'none' }}
        >
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition whitespace-nowrap ${
              tab === 'all'
                ? 'bg-calm-500 text-white border-calm-500'
                : 'border-gray-200 hover:border-calm-500'
            }`}
          >
            {t('catalog.tabAll')}
          </button>
          {CATALOG_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setTab(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition whitespace-nowrap ${
                tab === cat.id
                  ? 'bg-calm-500 text-white border-calm-500'
                  : 'border-gray-200 hover:border-calm-500'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Topic cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((topic) => (
            <CatalogCardView key={topic.slug} topic={topic} onClick={() => handleSelect(topic)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CatalogCardView({ topic, onClick }: { topic: Topic; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white rounded-3xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-xl hover:border-calm-500 transition transform hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="text-2xl mb-3">{topic.catalog.emoji}</div>
      <h3 className="font-bold text-calm-900 text-base mb-2">{topic.catalog.shortTitle}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{topic.catalog.shortDesc}</p>
    </button>
  );
}
