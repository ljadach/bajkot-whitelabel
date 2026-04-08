import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { JsonLd } from '../components/JsonLd';
import { TopicNav } from '../components/topic-landing/TopicNav';
import { TopicFooter } from '../components/topic-landing/TopicFooter';
import { getPageFaqItems, type FaqItemData } from '../lib/faqHelpers';
import { TOPICS } from '../data/topics';

export function HomePage() {
  const { t } = useTranslation('app');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const { t: tFaq } = useTranslation('faq');
  const allFaqItems = tFaq('items', { returnObjects: true }) as Record<string, FaqItemData>;
  const faqItems = getPageFaqItems(allFaqItems, 'home');

  return (
    <div
      className="min-h-screen antialiased selection:bg-magic-400 selection:text-white"
      style={{ fontFamily: "'Nunito', sans-serif", backgroundColor: '#FAFAFA', color: '#334155' }}
    >
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

      <TopicNav />

      {/* Hero */}
      <header className="pt-32 pb-20 px-6 relative overflow-hidden bg-gradient-to-br from-calm-50 to-white">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-calm-100 text-calm-800 text-sm font-bold mb-6">
            <i className="fa-solid fa-star text-magic-500" />
            {t('hero.betaBadge')}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-calm-900 leading-tight max-w-4xl mx-auto mb-6">
            {t('hero.headline')}
          </h1>
          <p className="text-lg md:text-xl text-gray-600 font-medium leading-relaxed max-w-2xl mx-auto mb-8">
            {t('hero.description')}
          </p>
          <a
            href="#tematy"
            className="inline-flex items-center bg-magic-500 hover:bg-magic-600 text-white px-8 py-4 rounded-full font-extrabold text-lg shadow-xl shadow-magic-500/30 transition transform hover:-translate-y-1"
          >
            <i className="fa-solid fa-wand-magic-sparkles mr-2" />
            {t('hero.getStarted')}
          </a>
          <p className="text-sm text-gray-500 font-semibold mt-4">
            <i className="fa-regular fa-clock text-calm-500 mr-1" />
            Gotowa do czytania w 15 minut
          </p>
        </div>
      </header>

      {/* Topics Grid */}
      <section id="tematy" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-magic-500 font-bold uppercase tracking-widest text-sm mb-2 block">
              Wybierz temat
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-calm-900 mb-4">
              Z jakim wyzwaniem mierzy się Twoje dziecko?
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Wybierz temat — stworzymy spersonalizowaną bajkę terapeutyczną, która pomoże Twojemu
              dziecku.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOPICS.map((topic) => (
              <Link
                key={topic.slug}
                to={`/problem/${topic.slug}`}
                className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all flex items-start gap-4 no-underline"
              >
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-calm-50 flex items-center justify-center text-calm-500 text-lg group-hover:bg-calm-100 transition-colors">
                  <i className={topic.scienceCards[0].icon} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-calm-900 text-sm leading-snug mb-1 group-hover:text-calm-500 transition-colors">
                    {topic.headline.replace(/,?\s*gdy$/, '')}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                    {topic.metaDescription}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-calm-900 mb-4">
              {t('learningExperience.title')}
            </h2>
            <p className="text-gray-600 text-lg">
              {t('learningExperience.subtitlePrefix')}{' '}
              <strong className="text-calm-900">{t('learningExperience.subtitleBold')}</strong>
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-magic-500 rounded-2xl flex items-center justify-center text-white text-xl font-black mb-5">
                1
              </div>
              <h3 className="text-xl font-bold text-calm-900 mb-3">
                {t('learningExperience.step1.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('learningExperience.step1.description')}
              </p>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-calm-500 rounded-2xl flex items-center justify-center text-white text-xl font-black mb-5">
                2
              </div>
              <h3 className="text-xl font-bold text-calm-900 mb-3">
                {t('learningExperience.step2.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('learningExperience.step2.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features / Why */}
      <section className="py-24 bg-calm-900 text-white px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <i className="fa-solid fa-book-open text-9xl absolute -top-10 -left-10 text-white" />
          <i className="fa-solid fa-heart text-9xl absolute bottom-10 right-10 text-white" />
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-magic-400 font-bold uppercase tracking-widest text-sm mb-2 block">
              Dlaczego Bajkoterapia?
            </span>
            <h2 className="text-3xl md:text-4xl font-black mb-6">{t('features.title')}</h2>
            <p className="text-calm-100 text-lg">{t('features.subtitle')}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-8">
            {[
              { key: 'promptFrameworks', icon: 'fa-solid fa-child' },
              { key: 'featureDiscovery', icon: 'fa-solid fa-brain' },
              { key: 'toolMatching', icon: 'fa-solid fa-palette' },
              { key: 'roleShortcuts', icon: 'fa-solid fa-comments' },
            ].map((feature, i) => (
              <div
                key={feature.key}
                className="bg-calm-800/50 p-8 rounded-3xl border border-calm-700 hover:bg-calm-800 transition"
              >
                <div
                  className={`w-14 h-14 ${i % 2 === 0 ? 'bg-magic-500' : 'bg-calm-500'} rounded-2xl flex items-center justify-center text-white text-2xl mb-6 shadow-lg`}
                >
                  <i className={feature.icon} />
                </div>
                <h3 className="text-xl font-bold mb-3">{t(`features.${feature.key}.title`)}</h3>
                <p className="text-calm-200 leading-relaxed">
                  {t(`features.${feature.key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-calm-900 mb-4">
              {t('curriculum.title')}
            </h2>
            <p className="text-lg font-bold text-calm-800 mb-2">{t('curriculum.subtitle')}</p>
            <p className="text-gray-600 max-w-2xl mx-auto">{t('curriculum.description')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { key: 'evolving', icon: 'fa-solid fa-book-open' },
              { key: 'adaptive', icon: 'fa-solid fa-images' },
              { key: 'feedback', icon: 'fa-solid fa-comments' },
            ].map((item) => (
              <div key={item.key} className="text-center">
                <div className="w-16 h-16 bg-calm-50 text-calm-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-sm">
                  <i className={item.icon} />
                </div>
                <h3 className="font-bold text-calm-900 mb-2">
                  {t(`curriculum.${item.key}.title`)}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {t(`curriculum.${item.key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-calm-900 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-magic-400 text-sm font-bold uppercase tracking-widest mb-2">
              {t('testimonials.title')}
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {t('testimonials.subtitle')}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {(['quote1', 'quote2'] as const).map((q) => (
              <div key={q} className="bg-calm-800/50 p-8 rounded-3xl border border-calm-700">
                <i className="fa-solid fa-quote-left text-calm-500/30 text-3xl mb-4 block" />
                <p className="text-calm-100 mb-4 leading-relaxed">{t(`testimonials.${q}.text`)}</p>
                <p className="text-sm text-calm-200/60 font-bold">
                  — {t(`testimonials.${q}.author`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-calm-900 text-center mb-12">
            {tFaq('sectionTitle')}
          </h2>
          <div className="space-y-3">
            {faqItems.map((item) => (
              <div
                key={item.id}
                className="bg-calm-50/50 rounded-2xl border border-calm-100 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === item.id ? null : item.id)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-calm-50 transition-colors"
                >
                  <span className="font-bold text-calm-900">{item.question}</span>
                  <i
                    className={`fa-solid fa-chevron-down text-calm-500 transition-transform ${openFaq === item.id ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === item.id && (
                  <div className="px-5 pb-5">
                    <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-calm-900 to-calm-800 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">{t('cta.title')}</h2>
          <p className="text-calm-200 mb-8 text-lg max-w-xl mx-auto">{t('cta.subtitle')}</p>
          <a
            href="#tematy"
            className="inline-flex items-center bg-magic-500 hover:bg-magic-600 text-white px-8 py-4 rounded-full font-extrabold text-lg shadow-xl shadow-magic-500/30 transition transform hover:-translate-y-1"
          >
            <i className="fa-solid fa-wand-magic-sparkles mr-2" />
            {t('cta.button')}
          </a>
          <p className="text-sm text-calm-200/50 mt-6">{t('cta.privacy')}</p>
        </div>
      </section>

      <TopicFooter />
    </div>
  );
}
