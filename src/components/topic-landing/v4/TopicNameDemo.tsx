import { useState } from 'react';
import type { Topic } from '../../../data/topics';
import { trackEvent } from '../../../lib/telemetry';

/**
 * "Wpisz imię dziecka" demo — HIDDEN for now (c3z, 2026-07-28): it returns
 * once src/data/storyOpenings.ts (per-problem simulated openings, generated
 * against the pipeline prompts) is reviewed, so the shown opening matches
 * what the pipeline actually writes. Flip SHOW_NAME_DEMO to re-enable.
 */
export const SHOW_NAME_DEMO = false;

/** Female iff ends with -a, minus common male exceptions. Replace with
 * childNameInflect-based gender once storyOpenings land (they carry m/f). */
const MALE_A = new Set(['kuba', 'barnaba', 'bonawentura', 'kosma', 'jarema', 'dyzma']);

export function TopicNameDemo({ topic }: { topic: Topic }) {
  const [name, setName] = useState('');
  const [shown, setShown] = useState<string | null>(null);

  const show = () => {
    const v = name.trim();
    const display = v ? v.charAt(0).toUpperCase() + v.slice(1) : 'bohater tej bajki';
    const fem = !!v && v.toLowerCase().endsWith('a') && !MALE_A.has(v.toLowerCase());
    // Placeholder template — replaced by STORY_OPENINGS[topic.slug] in F3.
    const sit = fem ? 'siedziała' : 'siedział';
    const knew = fem ? 'wiedziała' : 'wiedział';
    const pron = fem ? 'na nią' : 'na niego';
    setShown(
      `„Wieczorem, gdy słońce kładło się spać za wielkimi drzewami, w dziecięcym pokoju robiło się ciepło i przytulnie. Na miękkim dywanie, wśród klocków i pluszaków, ${sit} ${display} — i jeszcze nie ${knew}, że niedługo zacznie się przygoda, która od dawna czeka właśnie ${pron}…”`,
    );
    trackEvent('lp_name_demo_used', { topicSlug: topic.slug });
  };

  return (
    <section className="py-12 px-6 bg-navy text-white" id="demo-imie">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl md:text-3xl font-black mb-2">
          Wpisz imię dziecka i zobacz, jak zaczyna się jego bajka
        </h2>
        <p className="text-slate-300 mb-6">
          Bajka Twojego dziecka będzie napisana specjalnie dla niego. Tu możesz poczuć, jak to
          brzmi.
        </p>
        <div className="bg-white text-ink rounded-3xl p-6 max-w-3xl">
          <label htmlFor="demo-imie-input" className="font-extrabold text-sm text-navy">
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
              className="flex-1 border-2 border-amberlp-dark/50 rounded-xl px-4 py-2.5"
            />
            <button
              type="submit"
              className="bg-teallp text-white font-extrabold text-sm px-5 py-2.5 rounded-xl"
            >
              Zobacz fragment
            </button>
          </form>
          {shown && (
            <div className="bg-cream rounded-2xl px-5 py-4 italic text-[0.98rem]">
              {shown}
              <p className="not-italic text-xs text-ink-soft mt-2.5">
                Tak zaczynają się nasze bajki. Ta dla Twojego dziecka powstanie od zera — na
                podstawie tego, co nam o nim opowiesz.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
