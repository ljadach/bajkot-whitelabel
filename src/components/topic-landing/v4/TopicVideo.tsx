import { trackEvent } from '../../../lib/telemetry';
import type { Topic } from '../../../data/topics';
import { PROMO_VIDEO, SECTION_COPY } from '../../../data/lpContent';
import { Section, SectionHeading } from './Section';

export function TopicVideo({ topic }: { topic: Pick<Topic, 'slug'> }) {
  return (
    <Section id="film" className="bg-lp-cream">
      <SectionHeading sub={SECTION_COPY.video.sub}>{SECTION_COPY.video.heading}</SectionHeading>
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
