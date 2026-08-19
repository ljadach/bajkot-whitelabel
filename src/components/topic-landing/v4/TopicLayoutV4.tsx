import { Suspense, lazy } from 'react';
import type { TopicV4 } from '../../../data/topicV4Content';
import { SHOW_NAME_DEMO } from '../../../data/lpContent';
import { useLpEngagement } from '../../../lib/telemetry';
import { ClientOnly } from '../../ClientOnly';
import { TopicFooter } from '../TopicFooter';
import { TopicNavV4 } from './TopicNavV4';
import { TopicHeroV4 } from './TopicHeroV4';
import { TopicProduct } from './TopicProduct';
import { TopicVideo } from './TopicVideo';
import { TopicPainV4 } from './TopicPainV4';
import { TopicScienceV4 } from './TopicScienceV4';
import { TopicReviews } from './TopicReviews';
import { TopicSafety } from './TopicSafety';
import { TopicFaq } from './TopicFaq';
import { TopicPricing } from './TopicPricing';

// Lazy so the hidden demo (and its ~68 KB of story-opening data) stays out
// of the topic chunk until SHOW_NAME_DEMO flips.
const TopicNameDemo = lazy(() => import('./TopicNameDemo'));

/**
 * LP v4 section skeleton (docs/spec-lp-v4-rollout.md):
 * hero → product → video → pain → science → reviews → objections (safety+FAQ)
 * → pricing → engagement (hidden name demo). Same route, same SEO meta —
 * only the body of /problem/:slug changes. The order wizard moved to its own
 * page (/problem/:slug/zamow); every CTA navigates there.
 */
export function TopicLayoutV4({ topic }: { topic: TopicV4 }) {
  useLpEngagement({ surface: 'topic_landing', topicSlug: topic.slug });

  return (
    <div
      className="min-h-screen antialiased bg-lp-cream text-lp-ink selection:bg-lp-amber selection:text-lp-navy"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <TopicNavV4 topicSlug={topic.slug} showCta={false} />
      <TopicHeroV4 topic={topic} />
      <TopicProduct topic={topic} />
      <TopicVideo topic={topic} steps />
      <TopicPainV4 topic={topic} />
      <TopicScienceV4 topic={topic} />
      <TopicReviews />
      <TopicSafety topic={topic} />
      <TopicFaq />
      <TopicPricing topic={topic} />
      {SHOW_NAME_DEMO && (
        <ClientOnly fallback={null}>
          <Suspense fallback={null}>
            <TopicNameDemo topic={topic} />
          </Suspense>
        </ClientOnly>
      )}
      <TopicFooter />
    </div>
  );
}
