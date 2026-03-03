import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { JsonLd } from '../components/JsonLd';
import { PageShell } from '../components/layout/PageShell';
import { LandingCta } from '../components/landing/LandingCta';
import { buildFaqPageGroups, type FaqItemData } from '../lib/faqHelpers';
import { useLangFromUrl } from '../hooks/useLangFromUrl';

type Category = string;

/* ─── FaqCard ─── */

function FaqCard({ id, question, answer, isOpen, onToggle }: { id: string; question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="faq-card">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-neutral-50 transition-colors" aria-expanded={isOpen} aria-controls={`faq-answer-${id}`}>
        <span className="font-semibold text-neutral-900 pr-4">{question}</span>
        <svg className={`w-5 h-5 text-neutral-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div id={`faq-answer-${id}`} className="px-5 pb-5 bg-white">
          <p className="text-neutral-600 leading-[1.7] text-[15px]">{answer}</p>
        </div>
      )}
    </div>
  );
}

/* ─── FaqPage ─── */

export function FaqPage() {
  const { t } = useTranslation('faq');
  const navigate = useNavigate();
  const lang = useLangFromUrl();
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  // Build FAQ items from data-driven JSON structure
  const categoryLabels = t('categoryLabels', { returnObjects: true }) as Record<string, string>;
  const categoryOrder = t('categoryOrder', { returnObjects: true }) as string[];
  const items = t('items', { returnObjects: true }) as Record<string, FaqItemData>;

  const allCategoryGroups = buildFaqPageGroups(items, categoryLabels, categoryOrder);

  // Flat list for JSON-LD (only faqVisible items)
  const allItems = allCategoryGroups.flatMap((g) => g.items);

  // Category IDs derived from visible groups
  const categoryIds = allCategoryGroups.map((g) => g.category);

  // Filtered view
  const visibleGroups = activeCategory === 'all' ? allCategoryGroups : allCategoryGroups.filter((g) => g.category === activeCategory);

  return (
    <PageShell>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'AITutoro', item: `https://aitutoro.com/${lang}/` },
            { '@type': 'ListItem', position: 2, name: t('supportBreadcrumb'), item: `https://aitutoro.com/${lang}/support/faq` },
            { '@type': 'ListItem', position: 3, name: t('breadcrumb'), item: `https://aitutoro.com/${lang}/support/faq` },
          ],
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: allItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
          })),
        }}
      />

      {/* Hero */}
      <section className="max-w-content mx-auto px-4 sm:px-6 pt-16 pb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">{t('hero.title')}</h1>
        <p className="text-lg text-neutral-500 leading-relaxed max-w-2xl">{t('hero.subtitle')}</p>
      </section>

      {/* Category filter pills */}
      <section className="max-w-content mx-auto px-4 sm:px-6 pb-8">
        <div className="flex flex-wrap gap-2">
          {['all', ...categoryIds].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setOpenFaq(null);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
            >
              {cat === 'all' ? t('filterAll') : categoryLabels[cat]}
            </button>
          ))}
        </div>
      </section>

      {/* FAQ content */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        {visibleGroups.map((group) => (
          <div key={group.category} className={activeCategory === 'all' ? 'mb-10' : ''}>
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">{group.label}</h2>
            <div className="space-y-3">
              {group.items.map((item) => (
                <FaqCard key={item.id} id={item.id} question={item.question} answer={item.answer} isOpen={openFaq === item.id} onToggle={() => toggleFaq(item.id)} />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <LandingCta
        headline={t('cta.headline')}
        description={t('cta.description')}
        primaryCta={{
          label: t('cta.contact'),
          onClick: () => {
            void navigate(`/${lang}/about/contact`);
            document.querySelector('main')?.scrollTo(0, 0);
          },
        }}
        secondaryCta={{
          label: t('cta.trial'),
          onClick: () => {
            void navigate(`/${lang}/`, { state: { showSignIn: true } });
            document.querySelector('main')?.scrollTo(0, 0);
          },
        }}
      />
    </PageShell>
  );
}
