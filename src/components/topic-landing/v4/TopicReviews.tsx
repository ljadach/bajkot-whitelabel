import { REVIEWS, TRUSTPILOT_URL } from './lpContent';

export function TopicReviews() {
  return (
    <section className="py-12 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl md:text-3xl font-black text-navy mb-6">Opinie Rodziców</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {REVIEWS.map((r) => (
            <div key={r.who} className="bg-cream rounded-3xl p-6">
              <p className="italic text-[0.95rem] mb-3">„{r.text}”</p>
              <p className="text-sm font-extrabold text-navy">{r.who}</p>
            </div>
          ))}
        </div>
        <a
          href={TRUSTPILOT_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-4 font-extrabold text-teallp-text"
        >
          ⭐ Zobacz nasz profil na Trustpilot →
        </a>
        <p className="text-xs text-ink-soft mt-2">Opinie od klientów Bajkoterapii.</p>
      </div>
    </section>
  );
}
