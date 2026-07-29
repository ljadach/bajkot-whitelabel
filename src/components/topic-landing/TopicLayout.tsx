import type { Topic } from '../../data/topics';
import { ClientOnly } from '../ClientOnly';
import { TopicNav } from './TopicNav';
import { TopicHero } from './TopicHero';
import { TopicPain } from './TopicPain';
import { TopicScience } from './TopicScience';
import { LandingOrderFlow } from '../book/order-flow/LandingOrderFlow';
import { TopicFooter } from './TopicFooter';
import { TopicLayoutV4 } from './v4/TopicLayoutV4';
import { TOPIC_V4_CONTENT } from '../../data/topicV4Content';
import { WizardPlaceholder } from './WizardPlaceholder';

export function TopicLayout({ topic }: { topic: Topic }) {
  // A topic with v4 copy renders the v4 layout; the map covers all topics, so
  // the legacy branch below survives only as a rollback path until the F2
  // content review closes (then it goes away together with TopicHero/Pain/Science).
  const v4Copy = TOPIC_V4_CONTENT[topic.slug];
  if (v4Copy) {
    return <TopicLayoutV4 topic={{ ...topic, ...v4Copy }} />;
  }
  return (
    <div
      className="min-h-screen antialiased selection:bg-magic-400 selection:text-white"
      style={{ fontFamily: "'Nunito', sans-serif", backgroundColor: '#FAFAFA', color: '#334155' }}
    >
      <TopicNav />
      <TopicHero topic={topic} />
      <TopicPain topic={topic} />
      <TopicScience topic={topic} />
      <ClientOnly fallback={<WizardPlaceholder />}>
        <div id="kreator">
          <LandingOrderFlow topic={topic} />
        </div>
      </ClientOnly>
      <TopicFooter />
    </div>
  );
}
