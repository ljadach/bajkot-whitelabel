import { useState } from 'react';
import { Link } from 'react-router';
import { JsonLd } from '../components/JsonLd';
import { trackEvent } from '../lib/telemetry';
import { CATALOG_CATEGORIES, topicsByCategory, type CatalogCategory } from '../data/topics';
import { LP_FAQ, PRINT_GALLERY } from '../data/lpContent';
import { TopicNavV4 } from '../components/topic-landing/v4/TopicNavV4';
import { PhotoCarousel } from '../components/topic-landing/v4/PhotoCarousel';
import { CtaButton } from '../components/topic-landing/v4/CtaButton';
import { HeroTrustBullets } from '../components/topic-landing/v4/TopicHeroV4';
import { Section, SectionHeading } from '../components/topic-landing/v4/Section';
import { TopicProduct } from '../components/topic-landing/v4/TopicProduct';
import { TopicVideo } from '../components/topic-landing/v4/TopicVideo';
import { TopicReviews } from '../components/topic-landing/v4/TopicReviews';
import { TopicSafety } from '../components/topic-landing/v4/TopicSafety';
import { TopicFaq } from '../components/topic-landing/v4/TopicFaq';
import { TopicPricing } from '../components/topic-landing/v4/TopicPricing';
import { TopicFooter } from '../components/topic-landing/TopicFooter';

/**
 * Homepage rebuilt on the LP v4 design system (2026-07-30, Trello: "nowa
 * strona główna na bazie tych podstron"). Same sections and styling as
 * /problem/:slug, minus the topic-specific pain/science blocks and the inline
 * wizard — instead a topic grid routes visitors to their problem page, and
 * every CTA points at that grid.
 */

/** Pseudo-slug for telemetry: distinguishes homepage clicks from topic LPs. */
const HOME_SLUG = 'home';
const TOPICS_ANCHOR = '#tematy';

/** Shared safety illustration — matches the sample book's theme. */
const HOME_SAFETY_IMAGE = {
  src: '/lp/problem/lek-przed-ciemnoscia.webp',
  alt: 'Rozkładówka bajki terapeutycznej na drewnianym stole',
};

function HomeHero() {
  return (
    <header className="pt-24 pb-10 px-6 bg-lp-cream">
      <div className="max-w-6xl mx-auto grid md:grid-cols-[1.1fr_0.9fr] gap-x-8 items-center">
        <div className="flex flex-col md:col-start-1">
          <span className="self-start bg-lp-teal/10 text-lp-teal-text font-extrabold text-xs px-3 py-1.5 rounded-full mb-4">
            Dla dzieci 2–12 lat · gotowa w jeden wieczór
          </span>
          <h1 className="text-2xl md:text-4xl font-black text-lp-navy leading-tight mb-3">
            Bajka, w której Twoje dziecko jest bohaterem{' '}
            <span className="text-lp-amber-dark">— i wygrywa ze swoją trudnością</span>
          </h1>
          <p className="text-base text-lp-ink-soft max-w-xl mb-4">
            <b className="text-lp-navy">Dedykowana książka dla Twojego dziecka.</b> Wybierz temat —
            od lęku przed ciemnością po pierwsze dni w przedszkolu — a my napiszemy bajkę z
            imieniem, wyglądem i wyzwaniem Twojego malucha.
          </p>
          <div>
            <CtaButton topicSlug={HOME_SLUG} location="hero_home" href={TOPICS_ANCHOR} />
            <p className="text-sm text-lp-ink-soft mt-2.5">
              Najpierw czytasz, potem decydujesz, czy kupujesz.
            </p>
          </div>
        </div>
        <PhotoCarousel
          photos={PRINT_GALLERY}
          className="mt-5 md:mt-0 md:col-start-2 md:row-start-1 md:row-span-2"
        />
        <HeroTrustBullets className="mt-5 md:col-start-1" />
      </div>
    </header>
  );
}

function TopicsGrid() {
  const [category, setCategory] = useState<'all' | CatalogCategory>('all');
  const topics = topicsByCategory(category);

  const tabs: { id: 'all' | CatalogCategory; label: string; emoji?: string }[] = [
    { id: 'all', label: 'Wszystkie' },
    ...CATALOG_CATEGORIES,
  ];

  return (
    <Section id="tematy" className="bg-white">
      <SectionHeading
        center
        sub="Wybierz temat — bajka Twojego dziecka zmierzy się dokładnie z tą trudnością."
      >
        Z czym zmaga się Twoje dziecko?
      </SectionHeading>
      <div className="flex flex-wrap justify-center gap-2 mb-7">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategory(tab.id)}
            className={`text-sm font-bold px-4 py-2 rounded-full transition ${
              category === tab.id
                ? 'bg-lp-navy text-white'
                : 'bg-lp-cream text-lp-navy hover:bg-lp-cream-dark'
            }`}
          >
            {tab.emoji ? `${tab.emoji} ` : ''}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {topics.map((topic) => (
          <Link
            key={topic.slug}
            to={`/problem/${topic.slug}`}
            onClick={() => trackEvent('home_topic_clicked', { topicSlug: topic.slug })}
            className="bg-lp-cream rounded-3xl p-5 no-underline shadow-sm hover:shadow-md hover:-translate-y-0.5 transition flex flex-col gap-1.5"
          >
            <span className="text-3xl" aria-hidden>
              {topic.catalog.emoji}
            </span>
            <span className="font-black text-lp-navy">{topic.catalog.shortTitle}</span>
            <span className="text-sm text-lp-ink-soft">{topic.catalog.shortDesc}</span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

export function HomePage() {
  return (
    <div
      className="min-h-screen antialiased bg-lp-cream text-lp-ink selection:bg-lp-amber selection:text-lp-navy"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: LP_FAQ.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        }}
      />
      <TopicNavV4 topicSlug={HOME_SLUG} ctaHref={TOPICS_ANCHOR} />
      <HomeHero />
      <TopicsGrid />
      <TopicProduct topic={{ slug: HOME_SLUG }} />
      <TopicVideo topic={{ slug: HOME_SLUG }} />
      <TopicReviews />
      <TopicSafety topic={{ slug: HOME_SLUG }} ctaHref={TOPICS_ANCHOR} image={HOME_SAFETY_IMAGE} />
      <TopicFaq />
      <TopicPricing topic={{ slug: HOME_SLUG }} ctaHref={TOPICS_ANCHOR} />
      <TopicFooter />
    </div>
  );
}
