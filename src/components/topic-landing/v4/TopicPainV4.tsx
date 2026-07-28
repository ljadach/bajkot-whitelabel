import type { Topic } from '../../../data/topics';
import { CtaButton } from './CtaButton';

/**
 * v4 pain section. Prefers the four short scenes (F2 content); until a topic
 * gets them, falls back to the legacy long-form empathy/root-cause copy so
 * every topic can switch layouts without waiting for rewritten content.
 */
export function TopicPainV4({ topic }: { topic: Topic }) {
  const scenes = topic.painScenes ?? [topic.painEmpathy, topic.painRootCause];
  const relief = topic.painRelief ?? topic.painCta;

  return (
    <section className="py-12 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl md:text-3xl font-black text-navy mb-5">{topic.painHeadline}</h2>
        <div className="grid gap-3 max-w-2xl mb-6">
          {scenes.map((scene) => (
            <div
              key={scene}
              className="bg-cream border-l-4 border-amberlp rounded-xl px-4 py-3 text-[0.98rem]"
            >
              {scene}
            </div>
          ))}
        </div>
        <div className="bg-teallp/10 rounded-3xl px-6 py-5 max-w-2xl font-bold text-navy mb-6">
          {relief}
        </div>
        <CtaButton topicSlug={topic.slug} location="pain_v4" />
      </div>
    </section>
  );
}
