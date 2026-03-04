import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { SignIn } from '@clerk/clerk-react';
import { useLangFromUrl } from '../hooks/useLangFromUrl';
import { PageShell } from '../components/layout/PageShell';
import { JsonLd } from '../components/JsonLd';
import { getPageFaqItems, type FaqItemData } from '../lib/faqHelpers';

export function HomePage() {
  const { t } = useTranslation('app');
  const lang = useLangFromUrl();
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const location = useLocation();
  const [showSignIn, setShowSignIn] = useState(
    !!(location.state as { showSignIn?: boolean } | null)?.showSignIn,
  );
  const topRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const { t: tFaq } = useTranslation('faq');
  const allFaqItems = tFaq('items', { returnObjects: true }) as Record<string, FaqItemData>;
  const faqItems = getPageFaqItems(allFaqItems, 'home');

  return (
    <PageShell>
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
      {/* Top anchor for scroll */}
      <div ref={topRef} />

      {/* Split Hero Section */}
      <section className="hero-section w-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left - Value Proposition */}
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 text-xs font-semibold uppercase tracking-wide rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ring-1 ring-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t('hero.betaBadge')}
              </span>
              <h1 className="hero-headline text-3xl sm:text-4xl lg:text-5xl mb-6">
                {t('hero.headline')}
              </h1>
              <p className="hero-subheader text-lg sm:text-xl">{t('hero.description')}</p>
            </div>

            {/* Right - Sign In / Get Started */}
            <div className="flex justify-center lg:justify-end">
              {showSignIn ? (
                <div>
                  <SignIn routing="hash" />
                  <p className="text-fine-print text-center mt-4 px-4 max-w-xs mx-auto">
                    {t('emailNote.text')}
                  </p>
                </div>
              ) : (
                <div className="cta-anchor text-center lg:text-left">
                  <button onClick={() => setShowSignIn(true)} className="btn-cta text-lg">
                    {t('hero.getStarted')}
                  </button>
                  <p className="text-fine-print mt-4 max-w-xs">{t('emailNote.text')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Learning Experience Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 section-spacing">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900 mb-4">
            {t('learningExperience.title')}
          </h2>
          <p className="text-neutral-500 max-w-2xl mx-auto">
            {t('learningExperience.subtitlePrefix')}{' '}
            <strong className="text-neutral-700">{t('learningExperience.subtitleBold')}</strong>
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="process-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="number-indicator-outlined">1</div>
              <h3 className="text-lg font-bold text-neutral-900">
                {t('learningExperience.step1.title')}
              </h3>
            </div>
            <p className="text-neutral-500 leading-relaxed">
              {t('learningExperience.step1.description')}
            </p>
          </div>
          <div className="process-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="number-indicator-outlined">2</div>
              <h3 className="text-lg font-bold text-neutral-900">
                {t('learningExperience.step2.title')}
              </h3>
            </div>
            <p className="text-neutral-500 leading-relaxed">
              {t('learningExperience.step2.description')}
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-alt section-spacing">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-4">
              {t('features.title')}
            </h2>
            <p className="text-neutral-500 max-w-2xl mx-auto">{t('features.subtitle')}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="feature-card">
              <div className="feature-icon-box mb-4">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                {t('features.promptFrameworks.title')}
              </h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                {t('features.promptFrameworks.description')}
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-box mb-4">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                {t('features.featureDiscovery.title')}
              </h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                {t('features.featureDiscovery.description')}
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-box mb-4">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                {t('features.toolMatching.title')}
              </h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                {t('features.toolMatching.description')}
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-box mb-4">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                {t('features.roleShortcuts.title')}
              </h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                {t('features.roleShortcuts.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 section-spacing">
        <div className="text-center mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
            {t('curriculum.title')}
          </h2>
          <p className="text-lg font-semibold text-neutral-700 mb-2">{t('curriculum.subtitle')}</p>
          <p className="text-neutral-500 max-w-2xl mx-auto">{t('curriculum.description')}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mt-10">
          <div className="text-center">
            <div className="curriculum-icon mb-4">
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <h3 className="font-bold text-neutral-900 mb-2">{t('curriculum.evolving.title')}</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              {t('curriculum.evolving.description')}
            </p>
          </div>
          <div className="text-center">
            <div className="curriculum-icon mb-4">
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <h3 className="font-bold text-neutral-900 mb-2">{t('curriculum.adaptive.title')}</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              {t('curriculum.adaptive.description')}
            </p>
          </div>
          <div className="text-center">
            <div className="curriculum-icon mb-4">
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-neutral-900 mb-2">{t('curriculum.feedback.title')}</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              {t('curriculum.feedback.description')}
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section section-spacing">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-neutral-400 text-sm font-medium uppercase tracking-wider mb-2">
              {t('testimonials.title')}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {t('testimonials.subtitle')}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="testimonial-card">
              <svg
                className="w-5 h-5 text-neutral-500 mb-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-neutral-300 mb-4 leading-relaxed">
                {t('testimonials.quote1.text')}
              </p>
              <p className="text-sm text-neutral-500 font-medium">
                — {t('testimonials.quote1.author')}
              </p>
            </div>
            <div className="testimonial-card">
              <svg
                className="w-5 h-5 text-neutral-500 mb-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-neutral-300 mb-4 leading-relaxed">
                {t('testimonials.quote2.text')}
              </p>
              <p className="text-sm text-neutral-500 font-medium">
                — {t('testimonials.quote2.author')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 section-spacing">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 text-center mb-10">
          {tFaq('sectionTitle')}
        </h2>
        <div className="space-y-3">
          {faqItems.map((item) => (
            <div key={item.id} className="faq-card">
              <button
                onClick={() => toggleFaq(item.id)}
                className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-neutral-50 transition-colors"
              >
                <span className="font-semibold text-neutral-900">{item.question}</span>
                <svg
                  className={`w-5 h-5 text-neutral-400 transition-transform flex-shrink-0 ml-4 ${openFaq === item.id ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaq === item.id && (
                <div className="px-5 pb-5 bg-white">
                  <p className="text-neutral-500 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-neutral-900 section-spacing">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">{t('cta.title')}</h2>
          <p className="text-neutral-400 mb-8 max-w-xl mx-auto">{t('cta.subtitle')}</p>
          <button onClick={scrollToTop} className="btn-cta text-lg">
            {t('cta.button')}
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
          <p className="text-fine-print mt-6 text-neutral-500">{t('cta.privacy')}</p>
        </div>
      </section>
    </PageShell>
  );
}
