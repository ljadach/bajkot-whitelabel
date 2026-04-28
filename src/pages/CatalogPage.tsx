import { useTranslation } from 'react-i18next';
import { TopicNav } from '../components/topic-landing/TopicNav';
import { TopicFooter } from '../components/topic-landing/TopicFooter';
import { HomeTopicCatalog } from '../components/HomeTopicCatalog';
import { TOPICS } from '../data/topics';

export function CatalogPage() {
  const { t } = useTranslation('app');
  const topicCount = TOPICS.length;

  return (
    <div
      className="min-h-screen antialiased selection:bg-magic-400 selection:text-white"
      style={{ fontFamily: "'Nunito', sans-serif", backgroundColor: '#FAFAFA', color: '#334155' }}
    >
      <TopicNav />

      <header
        className="pt-28 pb-10 md:pt-36 md:pb-14"
        style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)' }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-magic-500 font-bold uppercase tracking-widest text-sm mb-3 block">
            {t('topicsSection.eyebrow')}
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-calm-900 leading-tight mb-4">
            {t('topicsSection.title')}
          </h1>
          <p className="text-lg text-slate-600">
            {t('topicsSection.subtitle', { count: topicCount })}
          </p>
        </div>
      </header>

      <HomeTopicCatalog />

      <TopicFooter />
    </div>
  );
}
