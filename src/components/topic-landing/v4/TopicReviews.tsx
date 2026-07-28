import { REVIEWS, TRUSTPILOT_URL } from '../../../data/lpContent';

export function TopicReviews() {
  return (
    <section className="py-12 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl md:text-3xl font-black text-lp-navy mb-6">Opinie Rodziców</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {REVIEWS.map((r) => (
            <div key={r.who} className="bg-lp-cream rounded-3xl p-6">
              <p className="italic text-[0.95rem] mb-3">„{r.text}”</p>
              <p className="text-sm font-extrabold text-lp-navy">{r.who}</p>
            </div>
          ))}
        </div>
        <a
          href={TRUSTPILOT_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-4 font-extrabold text-lp-teal-text"
        >
          ⭐ Zobacz nasz profil na Trustpilot →
        </a>
        <p className="text-xs text-lp-ink-soft mt-2">Opinie od klientów Bajkoterapii.</p>
      </div>
    </section>
  );
}
