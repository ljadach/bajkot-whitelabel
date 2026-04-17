import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { PIPELINE_STEPS } from '@lib/bookData';
import { friendlyBookError } from '@lib/bookErrors';
import { OrderTimeline } from './OrderTimeline';

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
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-muted">Order not found</p>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 spinner" />
      </div>
    );
  }

  if (progress.status === 'failed') {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-8 text-center">
          <h2 className="text-lg font-semibold text-red-700 mb-2">{t('progress.errorHeading')}</h2>
          <p className="text-sm text-red-600 mb-4">{friendlyBookError(progress.error)}</p>
          <button
            onClick={() => void navigate('/book/order')}
            className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            {t('progress.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (progress.status === 'paused') {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-8 text-center">
          <h2 className="text-lg font-semibold text-yellow-700 mb-2">
            {t('progress.pausedHeading', 'Tworzenie bajki wstrzymane')}
          </h2>
          <p className="text-sm text-yellow-600">
            {t(
              'progress.pausedDescription',
              'Bajka zostanie wznowiona wkrótce. Nie musisz nic robić.',
            )}
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.status === progress.status);

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-ink text-center mb-2">{t('progress.heading')}</h1>
      <p className="text-sm text-muted text-center mb-8">{t('progress.description')}</p>

      <div className="space-y-2">
        {PIPELINE_STEPS.map((pipelineStep, i) => {
          let state: 'done' | 'active' | 'waiting';
          if (i < currentIndex) {
            state = 'done';
          } else if (i === currentIndex) {
            state = 'active';
          } else {
            state = 'waiting';
          }

          return (
            <div
              key={pipelineStep.status}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                state === 'active'
                  ? 'bg-accent-subtle border border-accent'
                  : state === 'done'
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-bg-muted border border-transparent'
              }`}
            >
              {/* Status icon */}
              <div className="shrink-0">
                {state === 'done' && (
                  <svg
                    className="w-5 h-5 text-success"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {state === 'active' && (
                  <div className="w-4 h-4 spinner border-accent/30 border-t-accent" />
                )}
                {state === 'waiting' && <div className="w-4 h-4 rounded-full bg-neutral-300" />}
              </div>

              {/* Agent badge */}
              {pipelineStep.agent && (
                <span
                  className={`text-xs font-mono font-bold shrink-0 ${
                    state === 'active'
                      ? 'text-accent'
                      : state === 'done'
                        ? 'text-success'
                        : 'text-muted'
                  }`}
                >
                  {pipelineStep.agent}
                </span>
              )}

              {/* Label */}
              <span
                className={`text-sm ${
                  state === 'active'
                    ? 'font-semibold text-ink'
                    : state === 'done'
                      ? 'text-ink-secondary'
                      : 'text-muted'
                }`}
              >
                {pipelineStep.label}
              </span>

              {/* Status text */}
              <span className="ml-auto text-xs text-muted">
                {state === 'done' && t('progress.stepDone')}
                {state === 'active' && t('progress.stepActive')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Narrative timeline */}
      {events && events.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-muted mb-2">
            {t('progress.timeline', 'Co teraz robimy')}
          </h2>
          <OrderTimeline events={events} />
        </div>
      )}
    </div>
  );
}
