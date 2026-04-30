import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { JsonLd } from '../components/JsonLd';
import { TopicNav } from '../components/topic-landing/TopicNav';
import { TopicFooter } from '../components/topic-landing/TopicFooter';
import { getPageFaqItems, type FaqItemData } from '../lib/faqHelpers';
import { TOPICS } from '../data/topics';
import { trackEvent } from '../lib/telemetry';

const STEPS = [
  { key: 'pickTopic', emoji: '🎯' },
  { key: 'tellAboutChild', emoji: '👶' },
  { key: 'receiveBook', emoji: '📖' },
] as const;

const PRINCIPLES = [
  { key: 'selfReference', emoji: '🧠' },
  { key: 'safeDistance', emoji: '🛡️' },
  { key: 'wiseGuide', emoji: '🧙' },
  { key: 'therapeuticStructure', emoji: '📚' },
] as const;

const TESTIMONIALS = [
  {
    key: 'aska',
    avatarBg: 'bg-calm-100',
    avatarText: 'text-calm-800',
    avatar: '📚',
    featured: false,
    stars: true,
  },
  {
    key: 'expert',
    avatarBg: 'bg-calm-500',
    avatarText: 'text-white',
    avatar: 'AK',
    featured: true,
    stars: false,
  },
  {
    key: 'karolina',
    avatarBg: 'bg-pink-100',
    avatarText: 'text-pink-500',
    avatar: '👩‍👧‍👧',
    featured: false,
    stars: true,
  },
  {
    key: 'tomek',
    avatarBg: 'bg-calm-100',
    avatarText: 'text-calm-800',
    avatar: '👨‍👦',
    featured: false,
    stars: true,
  },
] as const;

export function HomePage() {
  const { t } = useTranslation('app');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const { t: tFaq } = useTranslation('faq');
  const allFaqItems = tFaq('items', { returnObjects: true }) as Record<string, FaqItemData>;
  const faqItems = getPageFaqItems(allFaqItems, 'home');

  const topicCount = TOPICS.length;

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

      <style>{`
        @keyframes hp-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .hp-float { animation: hp-float 4s ease-in-out infinite; }
        .hp-float-delay { animation: hp-float 4s ease-in-out 1s infinite; }
      `}</style>

      <TopicNav />

      <section
        className="pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="max-w-xl">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-calm-900 leading-tight mb-6">
                {t('hero.headline')}
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">{t('hero.description')}</p>
              <Link
                to="/katalog"
                onClick={() => trackEvent('cta_create_book_clicked', { location: 'homepage_hero' })}
                className="inline-flex items-center gap-2 bg-magic-500 hover:bg-magic-600 text-white font-bold px-8 py-4 rounded-full text-lg transition-colors shadow-lg hover:shadow-xl no-underline"
              >
                <i className="fa-solid fa-wand-magic-sparkles" />
                {t('hero.cta')}
              </Link>
              <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-clock text-calm-500" />
                  {t('hero.badges.fast')}
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-heart text-calm-500" />
                  {t('hero.badges.topics', { count: topicCount })}
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-flask text-calm-500" />
                  {t('hero.badges.research')}
                </span>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="relative w-full max-w-md mx-auto">
                <div className="bg-gradient-to-br from-calm-100 via-calm-50 to-white rounded-3xl shadow-xl p-8 sm:p-12 text-center hp-float">
                  <div className="text-7xl sm:text-8xl mb-4">📖</div>
                  <div className="text-calm-800 font-bold text-lg mb-1">{t('hero.book.title')}</div>
                  <div className="text-sm text-slate-500">{t('hero.book.subtitle')}</div>
                </div>
                <div className="absolute -top-4 -right-4 bg-magic-400 text-white w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center text-2xl hp-float-delay">
                  ✨
                </div>
                <div className="absolute -bottom-3 -left-3 bg-calm-500 text-white w-12 h-12 rounded-xl shadow-lg flex items-center justify-center text-xl hp-float">
                  🧸
                </div>
                <div className="absolute top-1/2 -right-6 bg-pink-100 text-pink-500 w-10 h-10 rounded-full shadow flex items-center justify-center text-lg hp-float-delay">
                  💛
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="jak-to-dziala" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-calm-900 mb-4">
              {t('howItWorks.title')}
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">{t('howItWorks.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div
                key={step.key}
                className="bg-white rounded-3xl shadow-xl p-8 text-center hover:shadow-2xl transition-shadow"
              >
                <div className="w-16 h-16 bg-calm-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">
                  {step.emoji}
                </div>
                <div className="text-xs font-bold text-calm-500 uppercase tracking-wider mb-2">
                  {t('howItWorks.stepLabel', { number: i + 1 })}
                </div>
                <h3 className="text-xl font-bold text-calm-900 mb-3">
                  {t(`howItWorks.steps.${step.key}.title`)}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {t(`howItWorks.steps.${step.key}.description`)}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/katalog"
              onClick={() =>
                trackEvent('cta_create_book_clicked', { location: 'homepage_how_it_works' })
              }
              className="inline-flex items-center gap-2 bg-magic-500 hover:bg-magic-600 text-white font-bold px-8 py-4 rounded-full text-lg transition-colors shadow-lg hover:shadow-xl no-underline"
            >
              <i className="fa-solid fa-wand-magic-sparkles" />
              {t('howItWorks.cta')}
            </Link>
          </div>
        </div>
      </section>

      <section id="dlaczego-dziala" className="py-20 md:py-28 bg-calm-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">{t('whyItWorks.title')}</h2>
            <p className="text-lg text-calm-200 max-w-2xl mx-auto">{t('whyItWorks.subtitle')}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            {PRINCIPLES.map((p) => (
              <div
                key={p.key}
                className="bg-white/10 backdrop-blur rounded-3xl p-8 border border-white/10"
              >
                <div className="text-4xl mb-4">{p.emoji}</div>
                <h3 className="text-xl font-bold mb-3 text-magic-400">
                  {t(`whyItWorks.cards.${p.key}.title`)}
                </h3>
                <p className="text-calm-100 leading-relaxed">
                  {t(`whyItWorks.cards.${p.key}.description`)}
                </p>
              </div>
            ))}
          </div>

          <p className="text-center mt-10 text-sm text-calm-200/70 italic">
            {t('whyItWorks.disclaimer')}
          </p>
        </div>
      </section>

      <section id="nasza-historia" className="py-20 md:py-28 bg-calm-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-calm-900 mb-4">
              {t('story.title')}
            </h2>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-12 space-y-6 text-lg leading-relaxed text-slate-700">
            <p>{t('story.p1')}</p>
            <p>{t('story.p2')}</p>
            <p>{t('story.p3')}</p>
            <p>{t('story.p4')}</p>

            <div className="pt-4 border-t border-calm-100">
              <p className="font-bold text-calm-800 text-base">{t('story.signature')}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="opinie" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-calm-900 mb-4">
              {t('opinions.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {TESTIMONIALS.map((tst) => {
              const role = t(`opinions.items.${tst.key}.role`);
              return (
                <div
                  key={tst.key}
                  className={`bg-white rounded-3xl shadow-xl p-8 flex flex-col ${
                    tst.featured ? 'border-2 border-calm-200' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 mb-5">
                    <div
                      className={`w-14 h-14 rounded-full ${tst.avatarBg} ${tst.avatarText} flex items-center justify-center text-2xl font-bold`}
                    >
                      {tst.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-calm-900">
                        {t(`opinions.items.${tst.key}.name`)}
                      </div>
                      {tst.featured ? (
                        <div className="text-sm text-white bg-calm-500 inline-block px-3 py-0.5 rounded-full font-semibold">
                          {role}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">{role}</div>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-600 leading-relaxed italic flex-1">
                    {t(`opinions.items.${tst.key}.quote`)}
                  </p>
                  {tst.stars && (
                    <div className="mt-4 flex gap-1 text-magic-400" aria-label="5/5">
                      <i className="fa-solid fa-star" />
                      <i className="fa-solid fa-star" />
                      <i className="fa-solid fa-star" />
                      <i className="fa-solid fa-star" />
                      <i className="fa-solid fa-star" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 md:py-28 bg-calm-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-calm-900 mb-4">
              {tFaq('sectionTitle')}
            </h2>
          </div>

          <div className="space-y-4">
            {faqItems.map((item) => {
              const isOpen = openFaq === item.id;
              return (
                <div key={item.id} className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : item.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between px-6 py-5 text-left"
                  >
                    <span className="font-bold text-calm-900 pr-4">{item.question}</span>
                    <i
                      className={`fa-solid fa-chevron-down text-calm-500 flex-shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-slate-600 leading-relaxed">{item.answer}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-calm-100 via-white to-calm-50 rounded-3xl shadow-xl p-10 sm:p-16">
            <div className="text-5xl mb-6">📖✨</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-calm-900 mb-6">
              {t('finalCta.title')}
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">{t('finalCta.subtitle')}</p>
            <Link
              to="/katalog"
              onClick={() => trackEvent('cta_create_book_clicked', { location: 'homepage_final' })}
              className="inline-flex items-center gap-2 bg-magic-500 hover:bg-magic-600 text-white font-bold px-10 py-4 rounded-full text-lg transition-colors shadow-lg hover:shadow-xl no-underline"
            >
              <i className="fa-solid fa-wand-magic-sparkles" />
              {t('finalCta.button')}
            </Link>
            <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-slate-500 font-medium">
              <span>{t('finalCta.badges.topics', { count: topicCount })}</span>
              <span>•</span>
              <span>{t('finalCta.badges.fast')}</span>
              <span>•</span>
              <span>{t('finalCta.badges.research')}</span>
            </div>
          </div>
        </div>
      </section>

      <TopicFooter />
    </div>
  );
}
