import type { Topic } from '../../../data/topics';
import { PRICING, GENERATION_MINUTES } from '../../../data/pricing';
import { PRINT_GALLERY } from './lpContent';
import { PhotoCarousel } from './PhotoCarousel';
import { CtaButton } from './CtaButton';

const TRUST_BULLETS = [
  `Książeczka w PDF — ${PRICING.pdf.promo} zł (gotowa w ${GENERATION_MINUTES} minut)`,
  `Książeczka drukowana + książeczka w PDF — ${PRICING.printBundle} zł`,
  'Wysyłka po Polsce w cenie',
];

export function TopicHeroV4({ topic }: { topic: Topic }) {
  return (
    <header className="pt-24 pb-10 px-6 bg-cream">
      <div className="max-w-6xl mx-auto grid md:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
        <div className="flex flex-col">
          <span className="self-start bg-teallp/10 text-teallp-text font-extrabold text-xs px-3 py-1.5 rounded-full mb-4">
            Dla dzieci 2–12 lat · gotowa w jeden wieczór
          </span>
          <h1 className="text-2xl md:text-4xl font-black text-navy leading-tight mb-3">
            {topic.headline} <span className="text-amberlp-dark">{topic.headlineAccent}</span>
          </h1>
          <p className="text-base text-ink-soft max-w-xl mb-4">
            <b className="text-navy">Dedykowana książka dla Twojego dziecka.</b> {topic.intro}
          </p>
          <div>
            <CtaButton topicSlug={topic.slug} location="hero_v4" />
            <p className="text-sm text-ink-soft mt-2.5">
              Najpierw czytasz, potem decydujesz, czy kupujesz.
            </p>
          </div>
          <div className="md:hidden mt-5">
            <PhotoCarousel photos={PRINT_GALLERY} />
          </div>
          <ul className="grid gap-1.5 mt-5 text-sm font-bold text-navy">
            {TRUST_BULLETS.map((b) => (
              <li key={b}>
                <span className="text-teallp-text font-black mr-1">✓</span>
                <a href="#cennik" className="text-navy">
                  {b}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="hidden md:block">
          <PhotoCarousel photos={PRINT_GALLERY} />
        </div>
      </div>
    </header>
  );
}
