import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import ReactMarkdown from 'react-markdown';
import { JsonLd } from '../components/JsonLd';
import { PageShell } from '../components/layout/PageShell';
import { LandingCta } from '../components/landing/LandingCta';
import { ComparisonFaq } from '../components/comparison/ComparisonFaq';
import { proseComponents } from '../lib/markdownComponents';
import { getPageFaqItems, type FaqItemData } from '../lib/faqHelpers';
import { useLangFromUrl } from '../hooks/useLangFromUrl';
import { usePublicNavigation } from '../hooks/usePublicNavigation';

interface GlossaryCategory {
  id: string;
  label: string;
  terms: string[];
}

interface GlossaryTerm {
  term: string;
  definition: string;
  whyItMatters: string;
  relatedTerms?: string[];
}

export function GlossaryPage() {
  const { t } = useTranslation('glossary');
  const { t: tc } = useTranslation('compare-common');
  const { t: tFaq } = useTranslation('faq');
  const lang = useLangFromUrl();
  const { handleSignUp, handleContact } = usePublicNavigation(lang);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = t('categories', { returnObjects: true }) as GlossaryCategory[];
  const categoriesArr = Array.isArray(categories) ? categories : [];

  const terms = t('terms', { returnObjects: true }) as Record<string, GlossaryTerm>;
  const termsMap = typeof terms === 'object' && terms !== null ? terms : {};

  // FAQ items for JSON-LD
  const allFaqItems = tFaq('items', { returnObjects: true }) as Record<string, FaqItemData>;
  const faqItems = getPageFaqItems(allFaqItems, 'glossary');

  // Track which category section is visible via IntersectionObserver
  const categoryIds = categoriesArr.map((c) => c.id).join(',');
  useEffect(() => {
    const ids = categoryIds.split(',').filter(Boolean);
    if (ids.length === 0) return;

    const scrollRoot = document.querySelector('main');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id.replace(/^cat-/, ''));
          }
        }
      },
      { root: scrollRoot, rootMargin: '-120px 0px -60% 0px', threshold: 0 }
    );

    for (const id of ids) {
      const el = document.getElementById(`cat-${id}`);
      if (el) observer.observe(el);
    }
    const faqEl = document.getElementById('faq');
    if (faqEl) observer.observe(faqEl);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryIds]);

  // Scroll to hash on load
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleTermClick = (termId: string) => {
    const el = document.getElementById(termId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${termId}`);
    }
  };

  const handleCategoryClick = (catId: string) => {
    const el = document.getElementById(`cat-${catId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Collect all JSON-LD defined terms
  const definedTerms = Object.entries(termsMap).map(([slug, term]) => ({
    '@type': 'DefinedTerm',
    name: term.term,
    description: term.definition,
    url: `https://aitutoro.com/${lang}/ai-tools/glossary#${slug}`,
  }));

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
            { '@type': 'ListItem', position: 3, name: t('breadcrumb'), item: `https://aitutoro.com/${lang}/ai-tools/glossary` },
          ],
        }}
      />

      {/* JSON-LD: DefinedTermSet */}
      {definedTerms.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'DefinedTermSet',
            name: t('meta.title'),
            description: t('meta.description'),
            datePublished: '2025-02-14',
            dateModified: '2026-02-18',
            inLanguage: lang,
            author: { '@type': 'Organization', name: 'AITutoro', url: 'https://aitutoro.com' },
            hasDefinedTerm: definedTerms,
          }}
        />
      )}

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

      <div className="max-w-content mx-auto px-4 sm:px-6 pt-12 pb-8 lg:flex lg:gap-10">
        {/* Main content */}
        <article className="flex-1 min-w-0 lg:max-w-article">
          {/* Hero */}
          <header className="mb-10">
            <h1 className="text-hero font-bold leading-[1.2] tracking-tight text-neutral-900 mb-4">{t('hero.title')}</h1>
            <div className="prose-enterprise mb-4">
              <ReactMarkdown components={proseComponents}>{t('hero.intro')}</ReactMarkdown>
            </div>
          </header>

          {/* How to use */}
          <section className="comparison-section">
            <div className="prose-enterprise">
              <ReactMarkdown components={proseComponents}>{t('howToUse.body')}</ReactMarkdown>
            </div>
          </section>

          {/* Category sections with terms */}
          {categoriesArr.map((cat) => (
            <section key={cat.id} id={`cat-${cat.id}`} className="comparison-section">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-6 tracking-tight">{cat.label}</h2>
              <div className="space-y-8">
                {cat.terms.map((termId) => {
                  const term = termsMap[termId];
                  if (!term) return null;
                  return (
                    <div key={termId} id={termId} className="scroll-mt-24">
                      <h3 className="text-lg font-semibold text-neutral-900 mb-2">{term.term}</h3>
                      <div className="prose-enterprise mb-3">
                        <ReactMarkdown components={proseComponents}>{term.definition}</ReactMarkdown>
                      </div>
                      {term.whyItMatters && (
                        <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 mb-3">
                          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">{t('whyItMattersLabel')}</p>
                          <p className="text-[14px] text-neutral-600 leading-relaxed">{term.whyItMatters}</p>
                        </div>
                      )}
                      {term.relatedTerms && term.relatedTerms.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {term.relatedTerms.map((rt) => (
                            <button key={rt} onClick={() => handleTermClick(rt)} className="text-xs px-2.5 py-1 rounded-full bg-accent-subtle text-accent-dark font-medium hover:bg-accent-subtle/80 transition-colors">
                              {termsMap[rt]?.term ?? rt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Mid-page CTA */}
          <div className="my-10">
            <LandingCta headline={tc('cta.midHeadline')} description={tc('cta.midDescription')} primaryCta={{ label: tc('cta.primaryLabel'), onClick: handleSignUp }} />
          </div>

          <ComparisonFaq pageKey="glossary" />

          {/* Bottom CTA */}
          <div className="mt-10 mb-10">
            <LandingCta headline={tc('cta.bottomHeadline')} description={tc('cta.bottomDescription')} primaryCta={{ label: tc('cta.primaryLabel'), onClick: handleSignUp }} secondaryCta={{ label: tc('cta.secondaryLabel'), onClick: handleContact }} />
          </div>
        </article>

        {/* Category sidebar — desktop only */}
        <aside className="hidden lg:block w-toc flex-shrink-0">
          <nav className="comparison-toc" aria-label="Glossary categories">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">{t('sidebarTitle')}</p>
            <ul className="space-y-1">
              {categoriesArr.map((cat) => (
                <li key={cat.id}>
                  <button onClick={() => handleCategoryClick(cat.id)} className={`comparison-toc-item ${activeCategory === cat.id ? 'comparison-toc-item--active' : ''}`}>
                    {cat.label}
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => {
                    const el = document.getElementById('faq');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`comparison-toc-item ${activeCategory === 'faq' ? 'comparison-toc-item--active' : ''}`}
                >
                  {tc('faq.title')}
                </button>
              </li>
            </ul>

            {/* Back to hub link */}
            <div className="mt-6 pt-4 border-t border-neutral-100">
              <Link to={`/${lang}/ai-tools`} className="text-xs font-medium text-accent-dark hover:underline flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                {t('backToHub')}
              </Link>
            </div>
          </nav>
        </aside>
      </div>
    </PageShell>
  );
}
