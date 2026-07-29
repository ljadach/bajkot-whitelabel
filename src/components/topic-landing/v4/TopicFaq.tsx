import { LP_FAQ, SECTION_COPY } from '../../../data/lpContent';
import { Section, SectionHeading } from './Section';

export function TopicFaq() {
  return (
    <Section className="bg-lp-cream-dark" flushTop>
      <SectionHeading>{SECTION_COPY.faq.heading}</SectionHeading>
      <div className="grid gap-2.5 max-w-3xl">
        {LP_FAQ.map((item) => (
          <details key={item.q} className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <summary className="font-extrabold text-lp-navy cursor-pointer">{item.q}</summary>
            <p className="mt-2 text-sm text-lp-ink-soft">{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
