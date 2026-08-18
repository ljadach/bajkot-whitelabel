import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { PIPELINE_STEPS } from '@lib/bookData';
import { friendlyBookError } from '@lib/bookErrors';
import { trackEvent } from '@lib/telemetry';
import { GENERATION_MINUTES_MAX } from '@lib/pricing';
import { trackPurchase, markPurchaseTrackedOnce } from '@lib/gtag';
import { getAttributionProps } from '@lib/attribution';
import { captureLandingOrderTokenFromUrl } from '../../hooks/useLandingOrderToken';
import { BookErrorScreen, BookPausedScreen, ProgressJourney } from './ProgressJourney';
import { StyleVoteCards } from './BookStyleVote';
import { DedicationForm } from './DedicationForm';
import { BrandFooter, BrandHeader } from '../BrandFooter';

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
      // Stripe normally redirects to the result page (`returnPath`), which
      // owns purchase tracking now. This stays as a guarded fallback for any
      // flow that returns to /progress — `markPurchaseTrackedOnce` shares the
      // result page's per-order key so the conversion can't be double-counted.
      if (checkout === 'success' && orderId && markPurchaseTrackedOnce(orderId)) {
        const sessionId = params.get('session_id');
        const attribution = getAttributionProps();
        trackEvent('payment_success', {
          flow,
          bookOrderId: orderId,
          sessionId,
          ...attribution,
        });
        trackPurchase({ transactionId: orderId });
      } else if (checkout === 'cancelled') {
        trackEvent('payment_cancelled', { flow, bookOrderId: orderId });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Landing flow attaches a per-order capability token to every call. Auth
  // flow leans on Clerk's identity and passes no extra args. The conditional
  // builder below keeps the rest of the shell ignorant of which flow it's in.
  const landingToken = flow === 'landing' ? captureLandingOrderTokenFromUrl(orderId) : null;
  const buildArgs = <T extends { orderId: Id<'bookOrders'> }>(
    base: T,
  ): T | (T & { accessToken: string }) =>
    flow === 'landing' && landingToken ? { ...base, accessToken: landingToken } : base;
  const landingReady = flow !== 'landing' || !!landingToken;

  const progress = useQuery(
    cfg.queries.progress,
    orderId && landingReady ? buildArgs({ orderId: orderId as Id<'bookOrders'> }) : 'skip',
  );

  // Landing flow hides the timeline section, so skip the events query
  // entirely instead of fetching data we'll throw away on the client.
  const events = useQuery(
    cfg.queries.events,
    orderId && flow !== 'landing' ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );

  const styleVoteImages = useQuery(
    cfg.queries.styleVoteImages,
    orderId && landingReady && progress?.hasStyleVoteImages && !progress?.chosenStyle
      ? buildArgs({ orderId: orderId as Id<'bookOrders'> })
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

  // Faza wyprowadzana ze stanu serwera. `phase` jest lokalne (rodzic może być
  // w trakcie wypełniania formularza), więc odtwarzamy je tylko wtedy, gdy
  // nic nie robi — inaczej po odświeżeniu strony albo powrocie z linku w mailu
  // krok dedykacji przepadał i zamówienie stało w `awaiting_dedication` do
  // auto-skipu po 5 minutach. Kolejność jest jawna: najpierw wybór stylu,
  // potem dedykacja.
  useEffect(() => {
    if (!progress || phase !== 'progress') return;
    if (progress.hasStyleVoteImages && !progress.chosenStyle) {
      setPhase('vote');
    } else if (progress.status === 'awaiting_dedication' && !progress.dedicationDecided) {
      setPhase('dedication');
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
      <ProgressLayout flow={flow}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
          <p className="text-sm text-gray-500">{t('progress.notFound')}</p>
        </div>
      </ProgressLayout>
    );
  }

  // Landing flow without a stored token can't authenticate to read the order.
  // Different browser or cleared localStorage — surface the not-found state
  // rather than hanging on a spinner.
  if (flow === 'landing' && !landingToken) {
    return (
      <ProgressLayout flow={flow}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
          <p className="text-sm text-gray-500">{t('progress.notFound')}</p>
        </div>
      </ProgressLayout>
    );
  }

  if (!progress) {
    return (
      <ProgressLayout flow={flow}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-6 h-6 spinner" />
        </div>
      </ProgressLayout>
    );
  }

  if (progress.status === 'failed') {
    return (
      <ProgressLayout flow={flow}>
        <BookErrorScreen
          error={friendlyBookError(progress.error)}
          retryLabel={t(cfg.retryLabelKey)}
          onRetry={() => void navigate(cfg.retryNav)}
        />
      </ProgressLayout>
    );
  }

  if (progress.status === 'paused') {
    return (
      <ProgressLayout flow={flow}>
        <BookPausedScreen />
      </ProgressLayout>
    );
  }

  // Inline: dedication form (after vote submitted).
  if (phase === 'dedication') {
    const handleDedicationSubmit = async (dedication: string) => {
      if (!orderId) return;
      const args = buildArgs({ orderId: orderId as Id<'bookOrders'> });
      // Mutation signatures differ across auth/landing by the optional
      // accessToken arg — both accept `dedication`, but the discriminated
      // union confuses TS at the call site. Cast keeps the JS identical.
      await submitDedication({ ...args, dedication } as Parameters<typeof submitDedication>[0]);
      trackEvent('dedication_submitted', { flow, bookOrderId: orderId });
      if (dedicationTimerRef.current) clearTimeout(dedicationTimerRef.current);
      setPhase('progress');
    };
    const handleDedicationSkip = async () => {
      if (!orderId) return;
      // Even when skipped, the backend needs to know the parent has decided —
      // otherwise the composer waits forever in `awaiting_dedication`.
      await skipDedication(buildArgs({ orderId: orderId as Id<'bookOrders'> }));
      trackEvent('dedication_skipped', { flow, bookOrderId: orderId });
      if (dedicationTimerRef.current) clearTimeout(dedicationTimerRef.current);
      setPhase('progress');
    };
    return (
      <ProgressLayout flow={flow} keepTabOpenNotice>
        <DedicationForm
          onSubmit={handleDedicationSubmit}
          onSkip={() => void handleDedicationSkip()}
        />
      </ProgressLayout>
    );
  }

  // Inline: style vote (when images ready and not yet chosen).
  if (phase === 'vote' && styleVoteImages && !styleVoteImages.chosenStyle) {
    const handleVote = async () => {
      if (!selected || !orderId || isSubmitting) return;
      setIsSubmitting(true);
      setVoteError(null);
      try {
        const args = buildArgs({ orderId: orderId as Id<'bookOrders'> });
        await submitVote({ ...args, choice: selected } as Parameters<typeof submitVote>[0]);
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
      <ProgressLayout flow={flow} keepTabOpenNotice>
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
      </ProgressLayout>
    );
  }

  // Landing visitors get a stripped-down progress screen — no event log,
  // no step list, no internal stage names — to keep the magic intact.
  const isLanding = flow === 'landing';
  return (
    <ProgressLayout flow={flow} keepTabOpenNotice>
      <ProgressJourney
        status={progress.status}
        pipelineSteps={PIPELINE_STEPS}
        events={isLanding ? undefined : (events ?? undefined)}
        childName={progress.childName}
        ageNumber={progress.ageNumber}
        problemId={progress.problemId}
        showStages={!isLanding}
        showStageLabel={!isLanding}
      />
    </ProgressLayout>
  );
}

/**
 * Loud, deliberately hard to miss: the pipeline asks the parent follow-up
 * questions (style vote, dedication) while the book is being written, so a
 * closed tab stalls the order. Shown on every live phase of this page and
 * never on the error/paused screens, where the work has already stopped.
 */
function KeepTabOpenNotice() {
  const { t } = useTranslation('book');
  return (
    <div className="px-6 pt-24 md:pt-28">
      <div className="max-w-2xl mx-auto rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 text-center">
        <p className="text-lg font-black text-amber-900 uppercase tracking-wide">
          <i className="fa-solid fa-triangle-exclamation mr-2" aria-hidden="true" />
          {t('progress.keepOpenTitle')}
        </p>
        <p className="mt-2 text-sm font-semibold text-amber-900 leading-relaxed">
          {t('progress.keepOpenBody', { minutes: GENERATION_MINUTES_MAX })}
        </p>
      </div>
    </div>
  );
}

function ProgressLayout({
  children,
  flow,
  keepTabOpenNotice = false,
}: {
  children: React.ReactNode;
  flow: ProgressFlow;
  keepTabOpenNotice?: boolean;
}) {
  // Auth flow keeps the global <Header> (Panel + avatar are useful there).
  // Landing flow hides the global header in root.tsx and renders this
  // wordmark-only BrandHeader instead — no menu, no CTA, no auth chrome.
  const isLanding = flow === 'landing';
  return (
    <>
      {isLanding && <BrandHeader />}
      {keepTabOpenNotice && <KeepTabOpenNotice />}
      {children}
      <BrandFooter />
    </>
  );
}
