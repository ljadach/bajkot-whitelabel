import { useState } from 'react';
import { Link } from 'react-router';
import { JsonLd } from '../components/JsonLd';
import { trackEvent } from '../lib/telemetry';
import { useLpEngagement } from '../lib/telemetry';
import { CATALOG_CATEGORIES, topicsByCategory, type CatalogCategory } from '../data/topics';
import { LP_FAQ, PRINT_GALLERY } from '../data/lpContent';
import { HowItWorksSteps } from '../components/topic-landing/v4/HowItWorksSteps';
import { TopicNavV4 } from '../components/topic-landing/v4/TopicNavV4';
import { PhotoCarousel } from '../components/topic-landing/v4/PhotoCarousel';
import { GENERATION_MINUTES } from '../lib/pricing';
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

/**
 * The homepage hero explains the service and then gets out of the way: the
 * topic grid below it is the real call to action, so there is no button here
 * that only scrolls the page. The print carousel keeps the right-hand column
 * on desktop, where the short copy leaves it free; on a phone that column does
 * not exist, so a `md:hidden` twin closes the hero in the slot the price
 * bullets used to occupy — those moved to the price section at the bottom.
 */
function HomeHero() {
  return (
    <header className="pt-24 pb-6 px-6 bg-lp-cream">
      <div className="max-w-6xl mx-auto grid md:grid-cols-[1.1fr_0.9fr] gap-x-8 items-center">
        <div className="flex flex-col md:col-start-1">
          <h1 className="text-2xl md:text-4xl font-black text-lp-navy leading-tight mb-3">
            Terapeutyczna bajka napisana dla jednego dziecka{' '}
            <span className="text-lp-amber-dark">— Twojego</span>
          </h1>
          <p className="text-base text-lp-ink-soft max-w-xl">
            Wybierasz trudność, opisujesz sytuację i swoje dziecko. W {GENERATION_MINUTES} minut
            dostajesz książkę, w której ono jest bohaterem — z jego imieniem, wyglądem i tym
            konkretnym wyzwaniem.
          </p>
          <p className="text-base text-lp-navy font-bold max-w-xl mt-3">
            Czytasz podgląd, dopiero potem decydujesz o zakupie.
          </p>
          {/* Phone-only twin of the desktop carousel on the right — same photos,
              so the browser fetches each file once. */}
          <PhotoCarousel photos={PRINT_GALLERY} className="md:hidden mt-5" />
        </div>
        <PhotoCarousel
          photos={PRINT_GALLERY}
          className="hidden md:block md:col-start-2 md:row-start-1"
        />
      </div>
    </header>
  );
}

function HowItWorks() {
  return (
    <Section id="jak-to-dziala" className="bg-white">
      <SectionHeading center sub="Od wyboru tematu do gotowej bajki w jeden wieczór.">
        Jak to działa
      </SectionHeading>
      <HowItWorksSteps />
    </Section>
  );
}

/**
 * How many topic cards show before "pokaż wszystkie". All 39 at once buries the
 * rest of the page under ~9000 px of scrolling on a phone.
 */
const VISIBLE_TOPICS = 9;

function TopicsGrid() {
  const [category, setCategory] = useState<'all' | CatalogCategory>('all');
  const [expanded, setExpanded] = useState(false);
  const allTopics = topicsByCategory(category);
  // A picked category is already short enough to show whole.
  const collapsed = category === 'all' && !expanded;
  const topics = collapsed ? allTopics.slice(0, VISIBLE_TOPICS) : allTopics;

  const tabs: { id: 'all' | CatalogCategory; label: string; emoji?: string }[] = [
    { id: 'all', label: 'Wszystkie' },
    ...CATALOG_CATEGORIES,
  ];

  return (
    <Section id="tematy" className="bg-white scroll-mt-20">
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
            onClick={() => {
              setCategory(tab.id);
              setExpanded(false);
              // Picking a category shortens the grid under the tabs, which on a
              // phone leaves the visitor mid-page looking at whitespace. Pull
              // the section heading back to the top of the viewport instead —
              // `scroll-mt-20` keeps it clear of the sticky nav.
              document.getElementById('tematy')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
            }}
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
            onClick={() => {
              trackEvent('home_topic_clicked', { topicSlug: topic.slug });
              // Same "topic committed" step as the catalog, so one funnel step
              // covers both entry points.
              trackEvent('topic_selected', {
                flow: 'landing',
                problemId: topic.slug,
                isCustom: false,
                trigger: 'user_choice',
              });
            }}
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
      {collapsed && allTopics.length > VISIBLE_TOPICS && (
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="bg-lp-cream-dark text-lp-navy font-bold text-sm px-6 py-3 rounded-full"
          >
            Pokaż wszystkie tematy ({allTopics.length})
          </button>
        </div>
      )}
    </Section>
  );
}

export function HomePage() {
  useLpEngagement({ surface: 'homepage' });

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
      <HowItWorks />
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
