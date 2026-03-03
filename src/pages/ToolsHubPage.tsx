import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { JsonLd } from '../components/JsonLd';
import { PageShell } from '../components/layout/PageShell';
import { LandingCta } from '../components/landing/LandingCta';
import { ComparisonFaq } from '../components/comparison/ComparisonFaq';
import { proseComponents, inlineComponents } from '../lib/markdownComponents';
import { getPageFaqItems, type FaqItemData } from '../lib/faqHelpers';
import { useLangFromUrl } from '../hooks/useLangFromUrl';
import { usePublicNavigation } from '../hooks/usePublicNavigation';

interface ToolCard {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  bestFor: string;
  pricing: string;
}

interface HubSection {
  id: string;
  title: string;
  body: string;
}

export function ToolsHubPage() {
  const { t } = useTranslation('tools-hub');
  const { t: tc } = useTranslation('compare-common');
  const { t: tFaq } = useTranslation('faq');
  const lang = useLangFromUrl();
  const { handleSignUp, handlePricing } = usePublicNavigation(lang);

  const tools = t('tools', { returnObjects: true }) as ToolCard[];
  const toolsArr = Array.isArray(tools) ? tools : [];

  const sections = t('sections', { returnObjects: true }) as HubSection[];
  const sectionsArr = Array.isArray(sections) ? sections : [];

  // FAQ items for JSON-LD
  const allFaqItems = tFaq('items', { returnObjects: true }) as Record<string, FaqItemData>;
  const faqItems = getPageFaqItems(allFaqItems, 'tools-hub');

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
            {t('lastUpdated')}
          </div>
          <h1 className="text-hero font-bold leading-tight tracking-tight text-neutral-900 mb-4">{t('hero.title')}</h1>
          <div className="text-base text-neutral-600 leading-relaxed max-w-[640px] mx-auto">
            <ReactMarkdown components={inlineComponents}>{t('hero.intro')}</ReactMarkdown>
          </div>
        </section>

        {/* Tool grid */}
        <section className="py-10">
          <h2 className="text-2xl font-semibold leading-snug tracking-tight text-neutral-900 mb-5">{t('grid.title')}</h2>
          <div className="text-[15px] text-neutral-600 leading-relaxed mb-6">
            <ReactMarkdown components={inlineComponents}>{t('grid.intro')}</ReactMarkdown>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {toolsArr.map((tool) => (
              <Link key={tool.slug} to={`/${lang}/ai-tools/${tool.slug}`} className="usecase-card flex flex-col no-underline text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                <span className="text-base font-semibold text-neutral-900 mb-1">{tool.name}</span>
                <span className="text-[11px] font-medium text-accent-dark mb-2">{tool.tagline}</span>
                <span className="text-[13px] text-neutral-600 leading-relaxed flex-1 mb-3">{tool.bestFor}</span>
                <span className="text-[12px] text-neutral-500 mb-3">{tool.pricing}</span>
                <span className="text-[13px] font-semibold text-accent-dark flex items-center gap-1">
                  {t('grid.learnMore')}
                  <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Navigation links to comparison hub and glossary */}
        <section className="py-10 border-t border-neutral-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to={`/${lang}/ai-tools/compare`} className="usecase-card flex flex-col items-center text-center no-underline text-inherit py-8">
              <svg className="w-8 h-8 text-accent-dark mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
              <span className="text-base font-semibold text-neutral-900 mb-1">{t('nav.comparisons')}</span>
              <span className="text-[13px] text-neutral-600">{t('nav.comparisonsDesc')}</span>
            </Link>
            <Link to={`/${lang}/ai-tools/glossary`} className="usecase-card flex flex-col items-center text-center no-underline text-inherit py-8">
              <svg className="w-8 h-8 text-accent-dark mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
              <span className="text-base font-semibold text-neutral-900 mb-1">{t('nav.glossary')}</span>
              <span className="text-[13px] text-neutral-600">{t('nav.glossaryDesc')}</span>
            </Link>
          </div>
        </section>

        {/* Content sections */}
        {sectionsArr.map((section) => (
          <section key={section.id} id={section.id} className="py-10 border-t border-neutral-100">
            <h2 className="text-2xl font-semibold leading-snug tracking-tight text-neutral-900 mb-5">{section.title}</h2>
            <div className="text-[15px] text-neutral-600 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={proseComponents}>
                {section.body}
              </ReactMarkdown>
            </div>
          </section>
        ))}

        {/* Mid-page CTA */}
        <div className="my-10">
          <LandingCta headline={t('cta.midHeadline')} description={t('cta.midDescription')} primaryCta={{ label: t('cta.primaryLabel'), onClick: handleSignUp }} secondaryCta={{ label: t('cta.secondaryLabel'), onClick: handlePricing }} />
        </div>

        {/* FAQ */}
        <ComparisonFaq pageKey="tools-hub" />

        {/* Bottom CTA */}
        <div className="mt-10 mb-16">
          <LandingCta headline={t('cta.bottomHeadline')} description={t('cta.bottomDescription')} primaryCta={{ label: t('cta.primaryLabel'), onClick: handleSignUp }} secondaryCta={{ label: t('cta.secondaryLabel'), onClick: handlePricing }} />
        </div>
      </div>
    </PageShell>
  );
}
