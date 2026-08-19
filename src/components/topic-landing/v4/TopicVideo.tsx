import { trackEvent } from '../../../lib/telemetry';
import type { Topic } from '../../../data/topics';
import { PROMO_VIDEO, SECTION_COPY } from '../../../data/lpContent';
import { Section, SectionHeading } from './Section';
import { HowItWorksSteps } from './HowItWorksSteps';

/**
 * `steps` opens the section with the numbered "Jak to działa" list instead of
 * the one-line subtitle (2026-08-19) — /problem/:slug has no such section of
 * its own, while the homepage carries it a screen above and would repeat it.
 */
export function TopicVideo({
  topic,
  steps = false,
}: {
  topic: Pick<Topic, 'slug'>;
  steps?: boolean;
}) {
  return (
    <Section id="film" className="bg-lp-cream">
      <SectionHeading sub={steps ? undefined : SECTION_COPY.video.sub}>
        {SECTION_COPY.video.heading}
      </SectionHeading>
      {steps && <HowItWorksSteps className="mb-8" />}
      <video
        controls
        muted
        playsInline
        preload="metadata"
        poster={PROMO_VIDEO.poster}
        width={1920}
        height={1080}
        onPlay={() => trackEvent('lp_promo_video_played', { topicSlug: topic.slug })}
        className="w-full max-w-3xl h-auto aspect-video rounded-3xl shadow-2xl shadow-lp-navy/20 bg-black"
      >
        <source src={PROMO_VIDEO.src} type="video/mp4" />
      </video>
    </Section>
  );
}
