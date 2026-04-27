import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { PIPELINE_STEPS } from '@lib/bookData';
import { friendlyBookError } from '@lib/bookErrors';
import { BookErrorScreen, BookPausedScreen, ProgressJourney } from './ProgressJourney';

export function BookProgress() {
  const { t } = useTranslation('book');
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const redirectedRef = useRef(false);

  const progress = useQuery(
    api.bookPipeline.getOrderProgress,
    orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );

  const events = useQuery(
    api.bookPipelineEvents.getOrderEventsPublic,
    orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );

  // Auto-redirect: vote page or result page
  useEffect(() => {
    if (!progress || !orderId || redirectedRef.current) return;

    // Vote needed: images ready but user hasn't chosen yet
    if (progress.hasStyleVoteImages && !progress.chosenStyle) {
      redirectedRef.current = true;
      void navigate(`/book/${orderId}/vote`);
    } else if (progress.status === 'completed') {
      redirectedRef.current = true;
      void navigate(`/book/${orderId}/result`);
    }
  }, [progress, orderId, navigate]);

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <p className="text-sm text-gray-500">Order not found</p>
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
        retryLabel={t('progress.retry')}
        onRetry={() => void navigate('/book/order')}
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
    />
  );
}
