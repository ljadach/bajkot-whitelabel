import type { Topic } from '../../../data/topics';
import {
  BOOK_PRICE_PDF_PLN,
  BOOK_PRICE_PDF_REGULAR_PLN,
  BOOK_PRICE_PDF_OMNIBUS_PLN,
  BOOK_PRICE_PRINT_PLN,
  BOOK_PRICE_AUDIO_BUNDLE_PLN,
  GENERATION_MINUTES,
  DELIVERY_DAYS_TEXT,
} from '../../../lib/pricing';
import { SECTION_COPY } from '../../../data/lpContent';
import { CtaButton } from './CtaButton';
import { Section, SectionHeading } from './Section';

interface PriceCard {
  title: string;
  price: number;
  priceNote?: string;
  regularPrice?: number;
  omnibus?: number;
  featured?: boolean;
  features: string[];
  location: string;
}

const CARDS: PriceCard[] = [
  {
    title: 'Książeczka w PDF',
    price: BOOK_PRICE_PDF_PLN,
    regularPrice: BOOK_PRICE_PDF_REGULAR_PLN,
    omnibus: BOOK_PRICE_PDF_OMNIBUS_PLN,
    featured: true,
    features: [
      'Cała spersonalizowana bajka z ilustracjami',
      `Gotowa w ${GENERATION_MINUTES} minut`,
      'Czytasz na tablecie albo drukujesz w domu',
      'Zostaje z Wami na zawsze',
    ],
    location: 'pricing_pdf',
  },
  {
    title: 'Książeczka drukowana + książeczka w PDF',
    price: BOOK_PRICE_PRINT_PLN,
    priceNote: 'z wysyłką',
    features: [
      'Wszystko z wariantu PDF',
      'Profesjonalnie wydrukowana książka',
      `Kurier w ${DELIVERY_DAYS_TEXT}, wysyłka po Polsce w cenie`,
      'Prezent, w którym dziecko widzi siebie',
    ],
    location: 'pricing_print',
  },
  {
    title: 'Książeczka w PDF + audiobook',
    price: BOOK_PRICE_AUDIO_BUNDLE_PLN,
    features: [
      'Wszystko z wariantu PDF',
      'Bajka czytana ciepłym głosem lektora',
      'Do słuchania przed snem i w aucie',
      'Plik audio zostaje z Wami na zawsze',
    ],
    location: 'pricing_audio',
  },
];

export function TopicPricing({ topic }: { topic: Topic }) {
  return (
    <Section id="cennik">
      <SectionHeading center sub={SECTION_COPY.pricing.sub}>
        {SECTION_COPY.pricing.heading}
      </SectionHeading>
      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {CARDS.map((card) => (
          <div
            key={card.location}
            className={
              card.featured
                ? 'relative bg-white border-[3px] border-lp-amber rounded-3xl p-6 flex flex-col shadow-lg'
                : 'bg-lp-cream rounded-3xl p-6 flex flex-col shadow-md'
            }
          >
            {card.featured && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-lp-amber text-lp-navy font-black text-xs px-4 py-1.5 rounded-full whitespace-nowrap">
                Najczęściej zamawiane
              </span>
            )}
            <h3 className="font-black text-lp-navy mb-1">{card.title}</h3>
            {card.regularPrice && (
              <span className="self-start bg-red-100 text-red-800 font-black text-xs px-3 py-0.5 rounded-full mb-1">
                Promocja
              </span>
            )}
            <p className="text-3xl font-black text-lp-navy my-1">
              {card.regularPrice && (
                <span className="text-lg text-lp-ink-soft line-through mr-2">
                  {card.regularPrice} zł
                </span>
              )}
              {card.price} zł{' '}
              {card.priceNote && (
                <small className="text-base text-lp-ink-soft">{card.priceNote}</small>
              )}
            </p>
            {card.omnibus && (
              <p className="text-[0.7rem] text-lp-ink-soft mb-3">
                Najniższa cena z ostatnich 30 dni: {card.omnibus} zł
              </p>
            )}
            <ul className="grid gap-1.5 text-sm mb-5">
              {card.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <CtaButton topicSlug={topic.slug} location={card.location} className="mt-auto" />
          </div>
        ))}
      </div>
      <p className="text-center text-sm font-bold text-lp-ink-soft mt-6">
        {SECTION_COPY.pricing.footer}
      </p>
    </Section>
  );
}
