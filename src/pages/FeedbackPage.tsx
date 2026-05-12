import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { TopicNav } from '../components/topic-landing/TopicNav';
import { TopicFooter } from '../components/topic-landing/TopicFooter';

const FeedbackForm = lazy(() =>
  import('../components/FeedbackForm').then((m) => ({ default: m.FeedbackForm })),
);

export function FeedbackPage() {
  const { t } = useTranslation('feedback');

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50">
      <TopicNav />
      <section className="pt-28 pb-16 md:pt-36 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">
            {t('pageHeading')}
          </h1>
          <p className="text-neutral-600 leading-relaxed mb-8">{t('pageBody')}</p>
          <Suspense
            fallback={<div className="h-64 bg-white rounded-xl border border-neutral-200" />}
          >
            <FeedbackForm />
          </Suspense>
        </div>
      </section>
      <TopicFooter />
    </div>
  );
}
