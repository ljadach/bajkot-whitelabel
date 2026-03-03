import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Navigate, Link } from 'react-router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { JsonLd } from '../components/JsonLd';
import { LandingCta } from '../components/landing/LandingCta';
import { ComparisonFaq } from '../components/comparison/ComparisonFaq';
import { proseComponents } from '../lib/markdownComponents';
import { PageShell } from '../components/layout/PageShell';
import { getProductConfig } from './productConfig';
import { getPageFaqItems, type FaqItemData } from '../lib/faqHelpers';
import { useLangFromUrl } from '../hooks/useLangFromUrl';
import { usePublicNavigation } from '../hooks/usePublicNavigation';

interface Section {
  id: string;
  title: string;
  body: string;
}

interface TocItem {
  id: string;
  label: string;
}

interface RelatedItem {
  slug: string;
  label: string;
  type: 'comparison' | 'product';
}

function ProductToc({ items }: { items: TocItem[] }) {
  const { t: tc } = useTranslation('compare-common');
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0 }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="comparison-toc" aria-label="Table of contents">
      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">{tc('toc.title')}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <button onClick={() => handleClick(item.id)} className={`comparison-toc-item ${activeId === item.id ? 'comparison-toc-item--active' : ''}`}>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const lang = useLangFromUrl();
  const { handleSignUp, handleContact } = usePublicNavigation(lang, { scrollToTop: true });

  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector('main')?.scrollTo(0, 0);
  }, [slug]);

  const config = slug ? getProductConfig(slug) : undefined;

  const { t } = useTranslation(config?.namespace ?? 'common');
  const { t: tc } = useTranslation('compare-common');
  const { t: tFaq } = useTranslation('faq');

  const sections = t('sections', { returnObjects: true }) as Section[];
  const sectionsArr: Section[] = Array.isArray(sections) ? sections : [];

  const related = t('related', { returnObjects: true }) as RelatedItem[];
  const relatedArr: RelatedItem[] = Array.isArray(related) ? related : [];

  // FAQ items for JSON-LD
  const allFaqItems = tFaq('items', { returnObjects: true }) as Record<string, FaqItemData>;
  const faqItems = getPageFaqItems(allFaqItems, slug ?? '');

  // Build TOC items
  const sectionIds = sectionsArr.map((s) => s.id).join(',');
  const tocItems: TocItem[] = useMemo(
    () => [{ id: 'quick-answer', label: 'TL;DR' }, ...sectionsArr.map((s) => ({ id: s.id, label: s.title })), { id: 'faq', label: tc('faq.title') }],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tc, sectionIds]
  );

  if (!config) {
    return <Navigate to={`/${lang}/`} replace />;
  }

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
            { '@type': 'ListItem', position: 3, name: config.toolName, item: `https://aitutoro.com/${lang}${config.canonicalPath}` },
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
          datePublished: '2026-02-16',
          dateModified: '2026-02-16',
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
          {/* Hero */}
          <header className="mb-10">
            <h1 className="text-hero font-bold leading-[1.2] tracking-tight text-neutral-900 mb-4">{t('hero.title')}</h1>
            <div className="prose-enterprise mb-4">
              <ReactMarkdown components={proseComponents}>{t('hero.intro')}</ReactMarkdown>
            </div>
            <span className="comparison-date-badge">
              {tc('dateBadge.prefix')} {t('lastUpdated')}
            </span>
          </header>

          {/* Quick answer */}
          <div className="comparison-quick-answer" id="quick-answer">
            <ReactMarkdown components={proseComponents}>{t('quickAnswer.body')}</ReactMarkdown>
          </div>

          {/* Content sections */}
          {sectionsArr.map((section) => (
            <section key={section.id} id={section.id} className="comparison-section">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4 tracking-tight">{section.title}</h2>
              <div className="prose-enterprise">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={proseComponents}>
                  {section.body}
                </ReactMarkdown>
              </div>
            </section>
          ))}

          {/* Mid-page CTA */}
          <div className="my-10">
            <LandingCta headline={tc('cta.midHeadline')} description={tc('cta.midDescription')} primaryCta={{ label: tc('cta.primaryLabel'), onClick: handleSignUp }} />
          </div>

          <ComparisonFaq pageKey={slug!} />

          {/* Related links */}
          {relatedArr.length > 0 && (
            <section className="comparison-section">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4 tracking-tight">{tc('related.title')}</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible">
                {relatedArr.map((item) => {
                  const to = item.type === 'comparison' ? `/${lang}/ai-tools/compare/${item.slug}` : `/${lang}/ai-tools/${item.slug}`;
                  return (
                    <Link key={item.slug} to={to} className="flex-shrink-0 usecase-card min-w-[200px] lg:min-w-0 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                      <span className="font-semibold text-sm text-neutral-900">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Bottom CTA */}
          <div className="mt-10 mb-10">
            <LandingCta headline={tc('cta.bottomHeadline')} description={tc('cta.bottomDescription')} primaryCta={{ label: tc('cta.primaryLabel'), onClick: handleSignUp }} secondaryCta={{ label: tc('cta.secondaryLabel'), onClick: handleContact }} />
          </div>
        </article>

        {/* TOC sidebar — desktop only */}
        <aside className="hidden lg:block w-toc flex-shrink-0">
          <ProductToc items={tocItems} />
        </aside>
      </div>
    </PageShell>
  );
}
