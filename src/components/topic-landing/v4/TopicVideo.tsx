import { trackEvent } from '../../../lib/telemetry';
import type { Topic } from '../../../data/topics';
import { GENERATION_MINUTES } from '../../../lib/pricing';
import { PROMO_VIDEO } from '../../../data/lpContent';

export function TopicVideo({ topic }: { topic: Topic }) {
  return (
    <section className="py-12 px-6 bg-lp-cream" id="film">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl md:text-3xl font-black text-lp-navy mb-2">
          Zobacz, jakie to proste w praktyce
        </h2>
        <p className="text-lp-ink-soft mb-6">
          {GENERATION_MINUTES} minut — od wpisania imienia do gotowej bajki dla Oli.
        </p>
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
      </div>
    </section>
  );
}
