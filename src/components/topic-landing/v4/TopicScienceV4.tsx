import type { Topic } from '../../../data/topics';
import { HERO_SCIENCE_CARD, SCIENCE_QUOTE } from '../../../data/lpContent';
import { Section, SectionHeading } from './Section';

/**
 * Science section: two topic-specific cards + the shared "named hero" card
 * (matches the real book structure), plus the shared scientific quote.
 */
export function TopicScienceV4({ topic }: { topic: Topic }) {
  const cards = [topic.scienceCards[0], topic.scienceCards[1], HERO_SCIENCE_CARD];

  return (
    <Section className="bg-lp-cream-dark">
      <SectionHeading>{topic.scienceHeadline}</SectionHeading>
      <div className="grid md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="bg-white rounded-3xl p-5">
            <div className="w-11 h-11 bg-lp-teal rounded-2xl flex items-center justify-center text-white text-lg mb-3">
              <i className={card.icon} />
            </div>
            <h3 className="font-black text-lp-navy mb-1">{card.title}</h3>
            <p className="text-sm text-lp-ink-soft">{card.description}</p>
          </div>
        ))}
      </div>
      <blockquote className="max-w-3xl mt-6 bg-lp-teal/10 border-l-4 border-lp-teal rounded-xl px-5 py-4">
        <p className="italic text-[0.95rem] text-lp-ink">„{SCIENCE_QUOTE.text}”</p>
        <cite className="block mt-2.5 not-italic text-sm font-bold text-lp-teal-text">
          — {SCIENCE_QUOTE.cite} ·{' '}
          <a href={SCIENCE_QUOTE.url} target="_blank" rel="noreferrer" className="underline">
            przeczytaj pracę naukową (PDF)
          </a>
        </cite>
      </blockquote>
    </Section>
  );
}
