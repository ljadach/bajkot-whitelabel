import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '../components/layout/PageShell';

const FeedbackForm = lazy(() =>
  import('../components/FeedbackForm').then((m) => ({ default: m.FeedbackForm })),
);

export function FeedbackPage() {
  const { t } = useTranslation('feedback');

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-3">{t('pageHeading')}</h1>
        <p className="text-neutral-600 leading-relaxed mb-8">{t('pageBody')}</p>
        <Suspense fallback={<div className="h-64 bg-white rounded-xl border border-neutral-200" />}>
          <FeedbackForm />
        </Suspense>
      </div>
    </PageShell>
  );
}
