import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { PIPELINE_STEPS } from '@lib/bookData';
import { friendlyBookError } from '@lib/bookErrors';
import { trackEvent } from '@lib/telemetry';
import { BookErrorScreen, BookPausedScreen, ProgressJourney } from './ProgressJourney';
import { StyleVoteCards } from './BookStyleVote';
import { DedicationForm } from './DedicationForm';

type InlinePhase = 'progress' | 'vote' | 'dedication';
export type ProgressFlow = 'auth' | 'landing';

interface FlowConfig {
  queries: {
    progress: typeof api.bookPipeline.getOrderProgress;
    events:
      | typeof api.bookPipelineEvents.getOrderEventsPublic
      | typeof api.bookPipeline.getLandingOrderEvents;
    styleVoteImages:
      | typeof api.bookPipeline.getStyleVoteImages
      | typeof api.bookPipeline.getLandingStyleVoteImages;
  };
  mutations: {
    submitVote:
      | typeof api.bookPipeline.submitStyleVote
      | typeof api.bookPipeline.submitLandingStyleVote;
    submitDedication:
      | typeof api.bookPipeline.submitParentDedication
      | typeof api.bookPipeline.submitLandingParentDedication;
    skipDedication:
      | typeof api.bookPipeline.skipParentDedication
      | typeof api.bookPipeline.skipLandingParentDedication;
  };
  resultPath: (id: string) => string;
  retryNav: string;
  retryLabelKey: 'progress.retry' | 'progress.retryHome';
}

const FLOW: Record<ProgressFlow, FlowConfig> = {
  auth: {
    queries: {
      progress: api.bookPipeline.getOrderProgress,
      events: api.bookPipelineEvents.getOrderEventsPublic,
      styleVoteImages: api.bookPipeline.getStyleVoteImages,
    },
    mutations: {
      submitVote: api.bookPipeline.submitStyleVote,
      submitDedication: api.bookPipeline.submitParentDedication,
      skipDedication: api.bookPipeline.skipParentDedication,
    },
    resultPath: (id) => `/book/${id}/result`,
    retryNav: '/book/order',
    retryLabelKey: 'progress.retry',
  },
  landing: {
    queries: {
      progress: api.bookPipeline.getLandingOrderProgress,
      events: api.bookPipeline.getLandingOrderEvents,
      styleVoteImages: api.bookPipeline.getLandingStyleVoteImages,
    },
    mutations: {
      submitVote: api.bookPipeline.submitLandingStyleVote,
      submitDedication: api.bookPipeline.submitLandingParentDedication,
      skipDedication: api.bookPipeline.skipLandingParentDedication,
    },
    resultPath: (id) => `/landing/book/${id}/result`,
    retryNav: '/',
    retryLabelKey: 'progress.retryHome',
  },
};

/**
 * Shared progress page used by both `/book/:id/progress` (auth flow) and
 * `/landing/book/:id/progress` (landing flow). The two routes only differ in
 * which Convex queries/mutations they bind to and where they navigate after
 * completion / failure — encoded in `FLOW[flow]`.
 */
export function BookProgressShell({ flow }: { flow: ProgressFlow }) {
  const cfg = FLOW[flow];
  const { t } = useTranslation('book');
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const redirectedRef = useRef(false);

  // Mount-only: progress_viewed + payment_success/cancelled (Stripe return).
  useEffect(() => {
    trackEvent('progress_viewed', { flow, bookOrderId: orderId });
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const checkout = params.get('checkout');
      if (checkout === 'success') {
        trackEvent('payment_success', {
          flow,
          bookOrderId: orderId,
          sessionId: params.get('session_id'),
        });
      } else if (checkout === 'cancelled') {
        trackEvent('payment_cancelled', { flow, bookOrderId: orderId });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = useQuery(
    cfg.queries.progress,
    orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );

  // Landing flow hides the timeline section, so skip the events query
  // entirely instead of fetching data we'll throw away on the client.
  const events = useQuery(
    cfg.queries.events,
    orderId && flow !== 'landing' ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );

  const styleVoteImages = useQuery(
    cfg.queries.styleVoteImages,
    orderId && progress?.hasStyleVoteImages && !progress?.chosenStyle
      ? { orderId: orderId as Id<'bookOrders'> }
      : 'skip',
  );

  const submitVote = useMutation(cfg.mutations.submitVote);
  const submitDedication = useMutation(cfg.mutations.submitDedication);
  const skipDedication = useMutation(cfg.mutations.skipDedication);

  const [phase, setPhase] = useState<InlinePhase>('progress');
  const [selected, setSelected] = useState<'A' | 'B' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const dedicationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up the post-vote → dedication delay timer on unmount so we don't try
  // to flip phase on a torn-down component.
  useEffect(() => {
    return () => {
      if (dedicationTimerRef.current) clearTimeout(dedicationTimerRef.current);
    };
  }, []);

  // Fire style_vote_viewed once when images first become available. Tied to
  // image URLs (not phase) so a rapid back-and-forth between phases doesn't
  // re-fire it, and the guard ref makes it idempotent regardless.
  const voteViewedRef = useRef(false);
  useEffect(() => {
    if (
      !voteViewedRef.current &&
      styleVoteImages?.imageUrlA &&
      styleVoteImages?.imageUrlB &&
      !styleVoteImages.chosenStyle
    ) {
      voteViewedRef.current = true;
      trackEvent('style_vote_viewed', { flow, bookOrderId: orderId });
    }
  }, [
    styleVoteImages?.imageUrlA,
    styleVoteImages?.imageUrlB,
    styleVoteImages?.chosenStyle,
    orderId,
    flow,
  ]);

  // Surface inline vote when images become available and choice not yet made.
  useEffect(() => {
    if (!progress) return;
    if (progress.hasStyleVoteImages && !progress.chosenStyle && phase === 'progress') {
      setPhase('vote');
    }
  }, [progress, phase]);

  // Auto-redirect: result page only (vote is now inline).
  useEffect(() => {
    if (!progress || !orderId || redirectedRef.current) return;
    if (progress.status === 'completed') {
      redirectedRef.current = true;
      void navigate(cfg.resultPath(orderId));
    }
  }, [progress, orderId, navigate, cfg]);

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
        retryLabel={t(cfg.retryLabelKey)}
        onRetry={() => void navigate(cfg.retryNav)}
      />
    );
  }

  if (progress.status === 'paused') {
    return <BookPausedScreen />;
  }

  // Inline: dedication form (after vote submitted).
  if (phase === 'dedication') {
    const handleDedicationSubmit = async (dedication: string) => {
      if (!orderId) return;
      await submitDedication({ orderId: orderId as Id<'bookOrders'>, dedication });
      trackEvent('dedication_submitted', { flow, bookOrderId: orderId });
      setPhase('progress');
    };
    const handleDedicationSkip = async () => {
      if (!orderId) return;
      // Even when skipped, the backend needs to know the parent has decided —
      // otherwise the composer waits forever in `awaiting_dedication`.
      await skipDedication({ orderId: orderId as Id<'bookOrders'> });
      trackEvent('dedication_skipped', { flow, bookOrderId: orderId });
      setPhase('progress');
    };
    return (
      <DedicationForm
        onSubmit={handleDedicationSubmit}
        onSkip={() => void handleDedicationSkip()}
      />
    );
  }

  // Inline: style vote (when images ready and not yet chosen).
  if (phase === 'vote' && styleVoteImages && !styleVoteImages.chosenStyle) {
    const handleVote = async () => {
      if (!selected || !orderId || isSubmitting) return;
      setIsSubmitting(true);
      setVoteError(null);
      try {
        await submitVote({
          orderId: orderId as Id<'bookOrders'>,
          choice: selected,
        });
        trackEvent('style_vote_submitted', {
          flow,
          bookOrderId: orderId,
          chosenStyle: selected,
        });
        // Drop back to the progress UI for a beat — the parent has just made a
        // choice; surfacing another form immediately feels relentless. Wait
        // ~30s of "trwa magia" before asking for a dedication.
        setPhase('progress');
        setIsSubmitting(false);
        if (dedicationTimerRef.current) clearTimeout(dedicationTimerRef.current);
        dedicationTimerRef.current = setTimeout(() => setPhase('dedication'), 30_000);
      } catch (err) {
        setVoteError(err instanceof Error ? err.message : 'Vote failed');
        setIsSubmitting(false);
      }
    };

    return (
      <StyleVoteCards
        imageUrlA={styleVoteImages.imageUrlA ?? null}
        imageUrlB={styleVoteImages.imageUrlB ?? null}
        selected={selected}
        onSelect={setSelected}
        onConfirm={() => void handleVote()}
        isSubmitting={isSubmitting}
        error={voteError}
        labels={{
          kicker: t('vote.kicker'),
          heading: t('vote.heading'),
          description: t('vote.description'),
          styleA: t('vote.styleA'),
          styleADesc: t('vote.styleADesc'),
          styleB: t('vote.styleB'),
          styleBDesc: t('vote.styleBDesc'),
          confirm: t('vote.confirm'),
          confirming: t('vote.confirming'),
          chooseFirst: t('vote.chooseFirst'),
        }}
      />
    );
  }

  return (
    <ProgressJourney
      status={progress.status}
      pipelineSteps={PIPELINE_STEPS}
      // Landing visitors don't see the raw pipeline event log — too
      // much noise for first-time parents. Auth flow keeps it for
      // power users who came back to inspect their order.
      events={flow === 'landing' ? undefined : (events ?? undefined)}
      childName={progress.childName}
      ageNumber={progress.ageNumber}
      problemId={progress.problemId}
    />
  );
}
