import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { CATALOG_CATEGORIES, topicsByCategory, type CatalogCategory } from '../data/topics';

type CatalogTab = CatalogCategory | 'all';

/**
 * 7-tab topic catalog rendered on the standalone `/katalog` page
 * (spec section 2, scenario B). Cards link to `/problem/<slug>` SEO pages.
 */
export function HomeTopicCatalog() {
  const { t: tBook } = useTranslation('book');
  const [tab, setTab] = useState<CatalogTab>('all');

  const filteredTopics = useMemo(() => topicsByCategory(tab), [tab]);

  return (
    <section id="tematy" className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tab filter buttons — mirrors OrderCatalog visual style. */}
        <div
          className="flex gap-3 overflow-x-auto pb-4 mb-8 px-2 justify-start sm:justify-center"
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
            {tBook('catalog.tabAll')}
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
          {filteredTopics.map((topic) => (
            <Link
              key={topic.slug}
              to={`/problem/${topic.slug}`}
              className="text-left bg-white rounded-3xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-xl hover:border-calm-500 transition transform hover:-translate-y-0.5 cursor-pointer no-underline"
            >
              <div className="text-2xl mb-3">{topic.catalog.emoji}</div>
              <h3 className="font-bold text-calm-900 text-base mb-2">{topic.catalog.shortTitle}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{topic.catalog.shortDesc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
