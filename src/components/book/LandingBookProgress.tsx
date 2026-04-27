import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { PIPELINE_STEPS } from '@lib/bookData';
import { friendlyBookError } from '@lib/bookErrors';
import { BookErrorScreen, BookPausedScreen, ProgressJourney } from './ProgressJourney';

export function LandingBookProgress() {
  const { t } = useTranslation('book');
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const redirectedRef = useRef(false);

  const progress = useQuery(
    api.bookPipeline.getLandingOrderProgress,
    orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );

  const events = useQuery(
    api.bookPipeline.getLandingOrderEvents,
    orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );

  useEffect(() => {
    if (!progress || !orderId || redirectedRef.current) return;

    if (progress.hasStyleVoteImages && !progress.chosenStyle) {
      redirectedRef.current = true;
      void navigate(`/landing/book/${orderId}/vote`);
    } else if (progress.status === 'completed') {
      redirectedRef.current = true;
      void navigate(`/landing/book/${orderId}/result`);
    }
  }, [progress, orderId, navigate]);

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <p className="text-sm text-gray-500">{t('progress.notFound')}</p>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 spinner" />
      </div>
    );
  }

  if (progress.status === 'failed') {
    return (
      <BookErrorScreen
        error={friendlyBookError(progress.error)}
        retryLabel={t('progress.retryHome')}
        onRetry={() => void navigate('/')}
      />
    );
  }

  if (progress.status === 'paused') {
    return <BookPausedScreen />;
  }

  return (
    <ProgressJourney
      status={progress.status}
      pipelineSteps={PIPELINE_STEPS}
      events={events ?? undefined}
      childName={progress.childName}
      ageNumber={progress.ageNumber}
      problemId={progress.problemId}
    />
  );
}
