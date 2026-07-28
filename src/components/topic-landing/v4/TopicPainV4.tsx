import type { TopicV4 } from '../../../data/topicV4Content';
import { CtaButton } from './CtaButton';

/** v4 pain section: four short scenes + a relief line (from topicV4Content). */
export function TopicPainV4({ topic }: { topic: TopicV4 }) {
  return (
    <section className="py-12 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl md:text-3xl font-black text-lp-navy mb-5">{topic.painHeadline}</h2>
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
      </div>
    </section>
  );
}
