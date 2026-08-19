import type { Topic } from '../../../data/topics';
import { PRINT_GALLERY } from '../../../data/lpContent';
import { PhotoCarousel } from './PhotoCarousel';
import { CtaButton } from './CtaButton';

export function TopicHeroV4({ topic }: { topic: Topic }) {
  return (
    <header className="pt-24 pb-10 px-6 bg-lp-cream">
      <div className="max-w-6xl mx-auto grid md:grid-cols-[1.1fr_0.9fr] gap-x-8 items-center">
        <div className="flex flex-col md:col-start-1">
          {/* The pill carries the topic's catalog name (2026-08-19), so the
              page announces the same label the visitor clicked on the hub. */}
          <span className="self-start bg-lp-teal/10 text-lp-teal-text font-extrabold text-xs px-3 py-1.5 rounded-full mb-4">
            {topic.catalog.shortTitle}
          </span>
          <h1 className="text-2xl md:text-4xl font-black text-lp-navy leading-tight mb-3">
            {topic.headline} <span className="text-lp-amber-dark">{topic.headlineAccent}</span>
          </h1>
          <p className="text-base text-lp-ink-soft max-w-xl mb-4">
            <b className="text-lp-navy">Dedykowana książka dla Twojego dziecka.</b> {topic.intro}
          </p>
          <div>
            <CtaButton topicSlug={topic.slug} location="hero_v4" />
            <p className="text-sm font-bold text-lp-navy mt-2.5">
              Bez zobowiązań!
              <br />
              Najpierw czytasz, potem decydujesz, czy kupujesz.
            </p>
          </div>
        </div>
        <PhotoCarousel
          photos={PRINT_GALLERY}
          className="mt-5 md:mt-0 md:col-start-2 md:row-start-1 md:row-span-2"
        />
      </div>
    </header>
  );
}
