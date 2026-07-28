import type { Topic } from '../../../data/topics';
import { HERO_SCIENCE_CARD, SCIENCE_QUOTE } from './lpContent';

/**
 * Science section: two topic-specific cards + the shared "named hero" card
 * (matches the real book structure), plus the shared scientific quote.
 */
export function TopicScienceV4({ topic }: { topic: Topic }) {
  const cards = [topic.scienceCards[0], topic.scienceCards[1], HERO_SCIENCE_CARD];

  return (
    <section className="py-12 px-6 bg-cream-dark">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl md:text-3xl font-black text-navy mb-6">{topic.scienceHeadline}</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div key={card.title} className="bg-white rounded-3xl p-5">
              <div className="w-11 h-11 bg-teallp rounded-2xl flex items-center justify-center text-white text-lg mb-3">
                <i className={card.icon} />
              </div>
              <h3 className="font-black text-navy mb-1">{card.title}</h3>
              <p className="text-sm text-ink-soft">{card.description}</p>
            </div>
          ))}
        </div>
        <blockquote className="max-w-3xl mt-6 bg-teallp/10 border-l-4 border-teallp rounded-xl px-5 py-4">
          <p className="italic text-[0.95rem] text-ink">„{SCIENCE_QUOTE.text}”</p>
          <cite className="block mt-2.5 not-italic text-sm font-bold text-teallp-text">
            — {SCIENCE_QUOTE.cite} ·{' '}
            <a href={SCIENCE_QUOTE.url} target="_blank" rel="noreferrer" className="underline">
              przeczytaj pracę naukową (PDF)
            </a>
          </cite>
        </blockquote>
      </div>
    </section>
  );
}
