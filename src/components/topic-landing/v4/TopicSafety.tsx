import type { Topic } from '../../../data/topics';
import { SAFETY_POINTS, SECTION_COPY, SPREAD_IMAGE } from '../../../data/lpContent';
import { CtaButton } from './CtaButton';
import { Section, SectionHeading } from './Section';

export function TopicSafety({ topic }: { topic: Topic }) {
  return (
    <Section
      className="bg-lp-cream-dark"
      containerClassName="grid md:grid-cols-2 gap-8 items-center"
    >
      <div>
        <SectionHeading>{SECTION_COPY.safety.heading}</SectionHeading>
        <ul className="grid gap-3">
          {SAFETY_POINTS.map((p) => (
            <li key={p.title} className="bg-white rounded-2xl px-4 py-3 shadow-sm text-sm">
              <b className="text-lp-navy">{p.title}</b> {p.body}
              {p.link && (
                <a href={p.link.href} className="text-lp-teal-text font-bold">
                  {p.link.text}
                </a>
              )}
              {p.tail}
            </li>
          ))}
        </ul>
        <div className="bg-lp-amber/10 border-2 border-dashed border-lp-amber rounded-3xl px-5 py-4 mt-5 font-bold text-lp-navy text-sm">
          Najlepsza gwarancja to ta, której nie musisz używać:{' '}
          <b>podgląd bajki czytasz przed zapłatą</b>. Nie podoba się — nie płacisz i nikt nie zada
          Ci ani jednego pytania.
        </div>
        <div className="mt-5">
          <CtaButton topicSlug={topic.slug} location="safety_v4" />
        </div>
      </div>
      <img
        src={SPREAD_IMAGE.src}
        alt={SPREAD_IMAGE.alt}
        loading="lazy"
        className="rounded-3xl shadow-xl"
        width={900}
        height={900}
      />
    </Section>
  );
}
