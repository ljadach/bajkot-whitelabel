import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Navigate } from 'react-router';
import { JsonLd } from '../components/JsonLd';
import { LandingCta } from '../components/landing/LandingCta';
import { ComparisonHero } from '../components/comparison/ComparisonHero';
import { QuickAnswer } from '../components/comparison/QuickAnswer';
import { ComparisonSection } from '../components/comparison/ComparisonSection';
import { ComparisonTable } from '../components/comparison/ComparisonTable';
import { UseCaseGrid } from '../components/comparison/UseCaseGrid';
import { ComparisonFaq } from '../components/comparison/ComparisonFaq';
import { TableOfContents } from '../components/comparison/TableOfContents';
import { RelatedComparisons } from '../components/comparison/RelatedComparisons';
import { PageShell } from '../components/layout/PageShell';
import { getComparisonConfig } from './comparisonConfig';
import { getPageFaqItems, type FaqItemData } from '../lib/faqHelpers';
import { useLangFromUrl } from '../hooks/useLangFromUrl';
import { usePublicNavigation } from '../hooks/usePublicNavigation';

interface Section {
  id: string;
  title: string;
  body: string;
  verdict?: { text: string; winner: 'a' | 'b' | 'tie' };
}

export function ComparisonPage() {
  const { slug } = useParams<{ slug: string }>();
  const lang = useLangFromUrl();
  const { handleSignUp, handleContact } = usePublicNavigation(lang, { scrollToTop: true });

  // Scroll to top when slug changes (navigating between comparisons)
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector('main')?.scrollTo(0, 0);
  }, [slug]);

  const config = slug ? getComparisonConfig(slug) : undefined;

  const { t } = useTranslation(config?.namespace ?? 'compare-common');
  const { t: tc } = useTranslation('compare-common');
  const { t: tFaq } = useTranslation('faq');

  if (!config) {
    return <Navigate to={`/${lang}/`} replace />;
  }

  const sections = t('sections', { returnObjects: true }) as Section[];
  const sectionsArr: Section[] = Array.isArray(sections) ? sections : [];

  const contextSection = { id: 'context', title: t('context.title'), body: t('context.body') };

  // FAQ items for JSON-LD
  const allFaqItems = tFaq('items', { returnObjects: true }) as Record<string, FaqItemData>;
  const faqItems = getPageFaqItems(allFaqItems, slug ?? '');

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
            { '@type': 'ListItem', position: 4, name: t('hero.title'), item: `https://aitutoro.com/${lang}${config.canonicalPath}` },
          ],
        }}
      />

      {/* JSON-LD: Article */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: t('meta.title'),
          description: t('meta.description'),
          datePublished: '2026-02-14',
          dateModified: '2026-02-14',
          author: { '@type': 'Organization', name: 'AITutoro', url: 'https://aitutoro.com' },
          publisher: { '@type': 'Organization', name: 'AITutoro', url: 'https://aitutoro.com' },
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

      {/* Main layout: content + TOC sidebar */}
      <div className="max-w-content mx-auto px-4 sm:px-6 pt-12 pb-8 lg:flex lg:gap-10">
        {/* Content area */}
        <article className="flex-1 min-w-0 lg:max-w-article">
          <ComparisonHero namespace={config.namespace} />
          <QuickAnswer namespace={config.namespace} />

          {/* Context section */}
          <ComparisonSection id={contextSection.id} title={contextSection.title} body={contextSection.body} toolA={config.toolA} toolB={config.toolB} />

          <ComparisonTable namespace={config.namespace} toolA={config.toolA} toolB={config.toolB} />

          {/* Analysis sections */}
          {sectionsArr.map((section) => (
            <ComparisonSection key={section.id} id={section.id} title={section.title} body={section.body} verdict={section.verdict} toolA={config.toolA} toolB={config.toolB} />
          ))}

          <UseCaseGrid namespace={config.namespace} toolA={config.toolA} toolB={config.toolB} />

          {/* Mid-page CTA */}
          <div className="my-10">
            <LandingCta headline={tc('cta.midHeadline')} description={tc('cta.midDescription')} primaryCta={{ label: tc('cta.primaryLabel'), onClick: handleSignUp }} />
          </div>

          <ComparisonFaq pageKey={slug!} />

          {/* Bottom CTA */}
          <div className="mt-10 mb-10">
            <LandingCta headline={tc('cta.bottomHeadline')} description={tc('cta.bottomDescription')} primaryCta={{ label: tc('cta.primaryLabel'), onClick: handleSignUp }} secondaryCta={{ label: tc('cta.secondaryLabel'), onClick: handleContact }} />
          </div>

          <RelatedComparisons namespace={config.namespace} />
        </article>

        {/* TOC sidebar — desktop only */}
        <aside className="hidden lg:block w-toc flex-shrink-0">
          <TableOfContents namespace={config.namespace} />
        </aside>
      </div>
    </PageShell>
  );
}
