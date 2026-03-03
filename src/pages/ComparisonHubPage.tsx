import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import ReactMarkdown from 'react-markdown';
import { JsonLd } from '../components/JsonLd';
import { PageShell } from '../components/layout/PageShell';
import { LandingCta } from '../components/landing/LandingCta';
import { ComparisonFaq } from '../components/comparison/ComparisonFaq';
import { inlineComponents } from '../lib/markdownComponents';
import { getPageFaqItems, type FaqItemData } from '../lib/faqHelpers';
import { useLangFromUrl } from '../hooks/useLangFromUrl';
import { usePublicNavigation } from '../hooks/usePublicNavigation';

interface ComparisonCard {
  slug: string;
  toolA: string;
  toolB: string;
  verdict: string;
}

interface CategoryItem {
  name: string;
  body: string;
}

interface QuestionItem {
  question: string;
  body: string;
}

interface PricingRow {
  tool: string;
  free: string;
  pro: string;
}

interface TrainingCard {
  title: string;
  body: string;
}

/* Heroicon SVGs — outlined, 1.5px stroke, round cap/join per VBS 5.4 */
const CategoryIcons = [
  // ChatBubbleLeftRight — LLMs
  <svg key="llm" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
  </svg>,
  // Squares2x2 — Productivity integrations
  <svg key="prod" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
  </svg>,
  // WrenchScrewdriver — Specialized tools
  <svg key="spec" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
  </svg>,
];

export function ComparisonHubPage() {
  const { t } = useTranslation('compare-hub');
  const { t: tc } = useTranslation('compare-common');
  const { t: tFaq } = useTranslation('faq');
  const lang = useLangFromUrl();
  const { handleSignUp, handlePricing } = usePublicNavigation(lang);

  const comparisons = t('comparisons', { returnObjects: true }) as ComparisonCard[];
  const categories = t('categories.items', { returnObjects: true }) as CategoryItem[];
  const questions = t('decisionFramework.questions', { returnObjects: true }) as QuestionItem[];
  const pricingRows = t('pricingSnapshot.rows', { returnObjects: true }) as PricingRow[];
  const trainingCards = t('training.cards', { returnObjects: true }) as TrainingCard[];

  // FAQ items for JSON-LD
  const allFaqItems = tFaq('items', { returnObjects: true }) as Record<string, FaqItemData>;
  const faqItems = getPageFaqItems(allFaqItems, 'compare-hub');

  return (
    <PageShell>
      {/* JSON-LD: BreadcrumbList */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'AITutoro', item: `https://aitutoro.com/${lang}/` },
            { '@type': 'ListItem', position: 2, name: tc('breadcrumbs.aiTools'), item: `https://aitutoro.com/${lang}/ai-tools` },
            { '@type': 'ListItem', position: 3, name: tc('breadcrumbs.comparisons'), item: `https://aitutoro.com/${lang}/ai-tools/compare` },
          ],
        }}
      />

      {/* JSON-LD: FAQPage */}
      {faqItems.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqItems.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          }}
        />
      )}

      <div className="max-w-[900px] mx-auto px-4 sm:px-6">
        {/* Hero */}
        <section className="pt-12 pb-8 text-center">
          <div className="comparison-date-badge gap-1.5 mb-4">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            {t('hero.dateBadge')}
          </div>
          <h1 className="text-hero font-bold leading-tight tracking-tight text-neutral-900 mb-4">{t('hero.title')}</h1>
          <p className="text-base text-neutral-600 leading-relaxed max-w-[640px] mx-auto">{t('hero.subtitle')}</p>
        </section>

        {/* Comparison grid */}
        <section className="py-10">
          <h2 className="text-2xl font-semibold leading-snug tracking-tight text-neutral-900 mb-5">{t('grid.title')}</h2>
          <div className="text-[15px] text-neutral-600 leading-relaxed mb-6">
            <ReactMarkdown components={inlineComponents}>{t('grid.intro')}</ReactMarkdown>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Array.isArray(comparisons) ? comparisons : []).map((comp) => (
              <Link key={comp.slug} to={`/${lang}/ai-tools/compare/${comp.slug}`} className="usecase-card flex flex-col no-underline text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                <span className="text-base font-semibold text-neutral-900 mb-2">
                  {comp.toolA} vs {comp.toolB}
                </span>
                <span className="text-[13px] text-neutral-600 leading-relaxed flex-1 mb-3">{comp.verdict}</span>
                <span className="text-[13px] font-semibold text-accent-dark flex items-center gap-1">
                  {t('grid.readComparison')}
                  <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Tool categories */}
        <section className="py-10 border-t border-neutral-100">
          <h2 className="text-2xl font-semibold leading-snug tracking-tight text-neutral-900 mb-5">{t('categories.title')}</h2>
          <p className="text-[15px] text-neutral-600 leading-relaxed mb-6">{t('categories.intro')}</p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(Array.isArray(categories) ? categories : []).map((cat, i) => (
              <div key={cat.name} className="bg-neutral-50 border border-neutral-100 rounded-xl p-6">
                <div className="w-12 h-12 rounded-xl bg-accent-subtle flex items-center justify-center mb-3 text-accent-dark">{CategoryIcons[i]}</div>
                <h3 className="text-[15px] font-semibold text-neutral-900 mb-2">{cat.name}</h3>
                <div className="text-[13px] text-neutral-600 leading-relaxed">
                  <ReactMarkdown components={inlineComponents}>{cat.body}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Decision framework */}
        <section className="py-10 border-t border-neutral-100">
          <h2 className="text-2xl font-semibold leading-snug tracking-tight text-neutral-900 mb-5">{t('decisionFramework.title')}</h2>
          <p className="text-[15px] text-neutral-600 leading-relaxed mb-6">{t('decisionFramework.intro')}</p>
          <div className="flex flex-col gap-4">
            {(Array.isArray(questions) ? questions : []).map((q, i) => (
              <div key={i} className="usecase-card flex gap-5 items-start">
                <div className="w-9 h-9 rounded-[10px] flex-shrink-0 bg-accent-subtle text-accent-dark text-[15px] font-bold flex items-center justify-center">{i + 1}</div>
                <div>
                  <h3 className="text-[15px] font-semibold text-neutral-900 mb-1.5">{q.question}</h3>
                  <div className="text-sm text-neutral-600 leading-relaxed">
                    <ReactMarkdown components={inlineComponents}>{q.body}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing snapshot */}
        <section className="py-10 border-t border-neutral-100">
          <h2 className="text-2xl font-semibold leading-snug tracking-tight text-neutral-900 mb-5">{t('pricingSnapshot.title')}</h2>
          <p className="text-[15px] text-neutral-600 leading-relaxed mb-6">{t('pricingSnapshot.intro')}</p>
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-900 w-[40%]">{t('pricingSnapshot.columns.tool')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-900 w-[30%]">{t('pricingSnapshot.columns.free')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-900 w-[30%]">{t('pricingSnapshot.columns.pro')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {(Array.isArray(pricingRows) ? pricingRows : []).map((row) => (
                  <tr key={row.tool}>
                    <td className="px-4 py-3 font-medium text-neutral-900">{row.tool}</td>
                    <td className="px-4 py-3 text-neutral-600">{row.free}</td>
                    <td className="px-4 py-3 text-neutral-600">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[13px] text-neutral-500 mt-3 leading-relaxed">
            <ReactMarkdown components={inlineComponents}>{t('pricingSnapshot.note')}</ReactMarkdown>
          </div>
        </section>

        {/* Mid-page CTA */}
        <div className="my-10">
          <LandingCta headline={t('cta.midHeadline')} description={t('cta.midDescription')} primaryCta={{ label: t('cta.primaryLabel'), onClick: handleSignUp }} secondaryCta={{ label: t('cta.secondaryLabel'), onClick: handlePricing }} />
        </div>

        {/* Adaptive training */}
        <section className="py-10 border-t border-neutral-100">
          <h2 className="text-2xl font-semibold leading-snug tracking-tight text-neutral-900 mb-5">{t('training.title')}</h2>
          <div className="text-[15px] text-neutral-600 leading-relaxed mb-4">
            <ReactMarkdown components={inlineComponents}>{t('training.intro1')}</ReactMarkdown>
          </div>
          <p className="text-[15px] text-neutral-600 leading-relaxed mb-6">{t('training.intro2')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(Array.isArray(trainingCards) ? trainingCards : []).map((card) => (
              <div key={card.title} className="bg-neutral-50 border border-neutral-100 rounded-xl px-6 py-5">
                <h3 className="text-sm font-semibold text-neutral-900 mb-1.5">{card.title}</h3>
                <p className="text-[13px] text-neutral-600 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <ComparisonFaq pageKey="compare-hub" />

        {/* Bottom CTA */}
        <div className="mt-10 mb-16">
          <LandingCta headline={t('cta.bottomHeadline')} description={t('cta.bottomDescription')} primaryCta={{ label: t('cta.primaryLabel'), onClick: handleSignUp }} secondaryCta={{ label: t('cta.secondaryLabel'), onClick: handlePricing }} />
        </div>
      </div>
    </PageShell>
  );
}
