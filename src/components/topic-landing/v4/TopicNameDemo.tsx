import { useState } from 'react';
import type { Topic } from '../../../data/topics';
import { STORY_OPENINGS } from '../../../data/storyOpenings';
import { trackEvent } from '../../../lib/telemetry';
import { Section } from './Section';

/**
 * "Wpisz imię dziecka" demo — gated by SHOW_NAME_DEMO in data/lpContent.ts
 * and lazy-loaded by TopicLayoutV4, so this file (and the story-openings
 * data) stays out of the topic bundle while the section is hidden.
 */

/** Female iff ends with -a, minus common male exceptions. TODO before the
 * flag flips: move gender inference into lib/childNameInflect.ts (which
 * already owns Polish name morphology) and use it here. */
const MALE_A = new Set(['kuba', 'barnaba', 'bonawentura', 'kosma', 'jarema', 'dyzma']);

export default function TopicNameDemo({ topic }: { topic: Topic }) {
  const [name, setName] = useState('');
  const [shown, setShown] = useState<string | null>(null);

  const opening = STORY_OPENINGS[topic.slug];
  if (!opening) return null;

  const show = () => {
    const v = name.trim();
    const display = v ? v.charAt(0).toUpperCase() + v.slice(1) : 'bohater tej bajki';
    const fem = !!v && v.toLowerCase().endsWith('a') && !MALE_A.has(v.toLowerCase());
    const text = opening.paragraphs
      .slice(0, 2)
      .map((p) => (fem ? p.f : p.m).replaceAll('{name}', display))
      .join(' ');
    setShown(`„${text}”`);
    trackEvent('lp_name_demo_used', { topicSlug: topic.slug });
  };

  return (
    <Section id="demo-imie" className="bg-lp-navy text-white">
      <h2 className="text-xl md:text-3xl font-black mb-2">
        Wpisz imię dziecka i zobacz, jak zaczyna się jego bajka
      </h2>
      <p className="text-slate-300 mb-6">
        Bajka Twojego dziecka będzie napisana specjalnie dla niego. Tu możesz poczuć, jak to brzmi.
      </p>
      <div className="bg-white text-lp-ink rounded-3xl p-6 max-w-3xl">
        <label htmlFor="demo-imie-input" className="font-extrabold text-sm text-lp-navy">
          Jak ma na imię Twoje dziecko?
        </label>
        <form
          className="flex flex-col sm:flex-row gap-2.5 mt-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            show();
          }}
        >
          <input
            id="demo-imie-input"
            type="text"
            maxLength={20}
            placeholder="np. Zosia, Antek"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 border-2 border-lp-amber-dark/50 rounded-xl px-4 py-2.5"
          />
          <button
            type="submit"
            className="bg-lp-teal text-white font-extrabold text-sm px-5 py-2.5 rounded-xl"
          >
            Zobacz fragment
          </button>
        </form>
        {shown && (
          <div className="bg-lp-cream rounded-2xl px-5 py-4 italic text-[0.98rem]">
            {shown}
            <p className="not-italic text-xs text-lp-ink-soft mt-2.5">
              Tak zaczynają się nasze bajki. Ta dla Twojego dziecka powstanie od zera — na podstawie
              tego, co nam o nim opowiesz.
            </p>
          </div>
        )}
      </div>
    </Section>
  );
}
