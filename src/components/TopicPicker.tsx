import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  CATALOG_CATEGORIES,
  topicsByCategory,
  type CatalogCategory,
} from '../../convex/lib/topics';
import { usePartnerPaths } from '../hooks/usePartner';
import { OrderFlowHeader } from './book/order-flow/OrderFlowHeader';
import { BrandFooter } from './BrandChrome';

type CatalogTab = CatalogCategory | 'all';

const tabClass = (active: boolean) =>
  `px-4 py-2 rounded-full text-sm font-bold border-2 transition whitespace-nowrap ${
    active
      ? 'bg-primary-500 text-on-primary border-primary-500'
      : 'bg-white border-gray-200 hover:border-primary-500'
  }`;

/**
 * Step 1 of the order flow: pick the problem the book should help with.
 * Category tabs filter the grid; a card opens that topic's order form.
 */
export function TopicPicker() {
  const { t } = useTranslation('book');
  const paths = usePartnerPaths();
  const [tab, setTab] = useState<CatalogTab>('all');
  const topics = topicsByCategory(tab);

  return (
    <div className="min-h-screen flex flex-col">
      <OrderFlowHeader step={1} />

      <section className="flex-1 pt-28 pb-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-accent-ink font-bold uppercase tracking-widest text-sm mb-2 block">
              {t('catalog.kicker')}
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-primary-900 mb-4">
              {t('catalog.heading')}
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">{t('catalog.subheading')}</p>
          </div>

          {/* Mobile: one swipeable row. Desktop: wrapped and centred —
              centring an overflowing row would clip its first tabs. */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar md:overflow-visible md:flex-wrap md:justify-center pb-4 mb-8 px-2">
            <button type="button" onClick={() => setTab('all')} className={tabClass(tab === 'all')}>
              {t('catalog.tabAll')}
            </button>
            {CATALOG_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setTab(cat.id)}
                className={tabClass(tab === cat.id)}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic) => (
              <Link
                key={topic.slug}
                to={paths.orderForm(topic.slug)}
                className="group text-left bg-white rounded-3xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-xl hover:border-primary-500 transition transform hover:-translate-y-0.5 no-underline"
              >
                <div className="text-2xl mb-3">{topic.catalog.emoji}</div>
                <h2 className="font-bold text-primary-900 text-base mb-2">
                  {topic.catalog.shortTitle}
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed">{topic.catalog.shortDesc}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-accent-ink">
                  {t('catalog.choose')}
                  <i
                    className="fa-solid fa-arrow-right text-xs transition group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <BrandFooter />
    </div>
  );
}
