import type { Topic } from '../../../data/topics';
import {
  BOOK_PRICE_PDF_PLN,
  BOOK_PRICE_PDF_REGULAR_PLN,
  BOOK_PRICE_PDF_OMNIBUS_PLN,
  BOOK_PRICE_PRINT_PLN,
  GENERATION_MINUTES,
} from '../../../lib/pricing';
import { PRINT_GALLERY } from '../../../data/lpContent';
import { PhotoCarousel } from './PhotoCarousel';
import { CtaButton } from './CtaButton';

const TRUST_BULLETS: { key: string; node: React.ReactNode }[] = [
  {
    key: 'pdf',
    node: (
      <>
        Książeczka w PDF —{' '}
        <s className="text-lp-ink-soft font-bold">{BOOK_PRICE_PDF_REGULAR_PLN} zł</s>{' '}
        {BOOK_PRICE_PDF_PLN} zł* (gotowa w {GENERATION_MINUTES} minut)
      </>
    ),
  },
  {
    key: 'print',
    node: <>Książeczka drukowana + książeczka w PDF — {BOOK_PRICE_PRINT_PLN} zł</>,
  },
  { key: 'shipping', node: <>Wysyłka w Polsce w cenie</> },
];

/** Price/shipping bullet list + Omnibus footnote — shared by topic hero and homepage hero. */
export function HeroTrustBullets({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <ul className="grid gap-1.5 text-sm font-bold text-lp-navy">
        {TRUST_BULLETS.map((b) => (
          <li key={b.key}>
            <span className="text-lp-teal-text font-black mr-1">✓</span>
            <a href="#cennik" className="text-lp-navy">
              {b.node}
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-lp-ink-soft mt-1.5">
        * Najniższa cena z ostatnich 30 dni: {BOOK_PRICE_PDF_OMNIBUS_PLN} zł
      </p>
    </div>
  );
}

export function TopicHeroV4({ topic }: { topic: Topic }) {
  return (
    <header className="pt-24 pb-10 px-6 bg-lp-cream">
      <div className="max-w-6xl mx-auto grid md:grid-cols-[1.1fr_0.9fr] gap-x-8 items-center">
        <div className="flex flex-col md:col-start-1">
          <span className="self-start bg-lp-teal/10 text-lp-teal-text font-extrabold text-xs px-3 py-1.5 rounded-full mb-4">
            Dla dzieci 2–12 lat · gotowa w jeden wieczór
          </span>
          <h1 className="text-2xl md:text-4xl font-black text-lp-navy leading-tight mb-3">
            {topic.headline} <span className="text-lp-amber-dark">{topic.headlineAccent}</span>
          </h1>
          <p className="text-base text-lp-ink-soft max-w-xl mb-4">
            <b className="text-lp-navy">Dedykowana książka dla Twojego dziecka.</b> {topic.intro}
          </p>
          <div>
            <CtaButton topicSlug={topic.slug} location="hero_v4" />
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
