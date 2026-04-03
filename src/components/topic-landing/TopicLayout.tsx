import type { Topic } from '../../data/topics';
import { ClientOnly } from '../ClientOnly';
import { TopicNav } from './TopicNav';
import { TopicHero } from './TopicHero';
import { TopicPain } from './TopicPain';
import { TopicScience } from './TopicScience';
import { TopicWizard } from './TopicWizard';
import { TopicFooter } from './TopicFooter';

function WizardPlaceholder() {
  return (
    <section id="kreator" className="py-24 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto text-center">
        <div className="w-8 h-8 spinner mx-auto" />
      </div>
    </section>
  );
}

export function TopicLayout({ topic }: { topic: Topic }) {
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
        <TopicWizard topic={topic} />
      </ClientOnly>
      <TopicFooter />
    </div>
  );
}
