import { REVIEWS, SECTION_COPY, TRUSTPILOT_URL } from '../../../data/lpContent';
import { Section, SectionHeading } from './Section';

export function TopicReviews() {
  return (
    <Section track="opinie">
      <SectionHeading>{SECTION_COPY.reviews.heading}</SectionHeading>
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
    </Section>
  );
}
