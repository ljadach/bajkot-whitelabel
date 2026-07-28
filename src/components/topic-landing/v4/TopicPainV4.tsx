import type { TopicV4 } from '../../../data/topicV4Content';
import { CtaButton } from './CtaButton';
import { Section, SectionHeading } from './Section';

/** v4 pain section: four short scenes + a relief line (from topicV4Content). */
export function TopicPainV4({ topic }: { topic: TopicV4 }) {
  return (
    <Section>
      <SectionHeading>{topic.painHeadline}</SectionHeading>
      <div className="grid gap-3 max-w-2xl mb-6">
        {topic.painScenes.map((scene) => (
          <div
            key={scene}
            className="bg-lp-cream border-l-4 border-lp-amber rounded-xl px-4 py-3 text-[0.98rem]"
          >
            {scene}
          </div>
        ))}
      </div>
      <div className="bg-lp-teal/10 rounded-3xl px-6 py-5 max-w-2xl font-bold text-lp-navy mb-6">
        {topic.painRelief}
      </div>
      <CtaButton topicSlug={topic.slug} location="pain_v4" />
    </Section>
  );
}
