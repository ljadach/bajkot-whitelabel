import type { Topic } from '../../../data/topics';
import { ClientOnly } from '../../ClientOnly';
import { TopicNav } from '../TopicNav';
import { TopicFooter } from '../TopicFooter';
import { LandingOrderFlow } from '../../book/order-flow/LandingOrderFlow';
import { TopicHeroV4 } from './TopicHeroV4';
import { TopicProduct } from './TopicProduct';
import { TopicVideo } from './TopicVideo';
import { TopicPainV4 } from './TopicPainV4';
import { TopicScienceV4 } from './TopicScienceV4';
import { TopicReviews } from './TopicReviews';
import { TopicSafety } from './TopicSafety';
import { TopicFaq } from './TopicFaq';
import { TopicPricing } from './TopicPricing';
import { TopicNameDemo, SHOW_NAME_DEMO } from './TopicNameDemo';

function WizardPlaceholder() {
  return (
    <section className="py-24 px-6 bg-cream">
      <div className="max-w-4xl mx-auto text-center">
        <div className="w-8 h-8 spinner mx-auto" />
      </div>
    </section>
  );
}

/**
 * LP v4 section skeleton (docs/spec-lp-v4-rollout.md):
 * hero → product → video → pain → science → reviews → objections (safety+FAQ)
 * → pricing → engagement (hidden name demo + inline wizard). Same route,
 * same SEO meta — only the body of /problem/:slug changes.
 */
export function TopicLayoutV4({ topic }: { topic: Topic }) {
  return (
    <div
      className="min-h-screen antialiased bg-cream text-ink selection:bg-amberlp selection:text-navy"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <TopicNav />
      <TopicHeroV4 topic={topic} />
      <TopicProduct topic={topic} />
      <TopicVideo topic={topic} />
      <TopicPainV4 topic={topic} />
      <TopicScienceV4 topic={topic} />
      <TopicReviews />
      <TopicSafety topic={topic} />
      <TopicFaq />
      <TopicPricing topic={topic} />
      {SHOW_NAME_DEMO && <TopicNameDemo topic={topic} />}
      <ClientOnly fallback={<WizardPlaceholder />}>
        <div id="kreator">
          <LandingOrderFlow topic={topic} />
        </div>
      </ClientOnly>
      <TopicFooter />
    </div>
  );
}
