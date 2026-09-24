import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { PIPELINE_STEPS } from '@lib/bookData';
import { friendlyBookError } from '@lib/bookErrors';
import { GENERATION_MINUTES_MAX } from '@lib/pricing';
import { captureOrderTokenFromUrl } from '../../hooks/useOrderToken';
import { usePartnerPaths } from '../../hooks/usePartner';
import { BookErrorScreen, BookPausedScreen, ProgressJourney } from './ProgressJourney';
import { StyleVoteCards } from './StyleVoteCards';
import { DedicationForm } from './DedicationForm';
import { BrandFooter, BrandHeader } from '../BrandChrome';

type InlinePhase = 'progress' | 'vote' | 'dedication';

/**
 * Live progress page — /bajka/:orderId. While the pipeline runs, the parent
 * answers two follow-up questions inline: the illustration style vote, then
 * the dedication. When the book is done we move on to the result page.
 * Every call carries the per-order capability token.
 */
export function BookProgress() {
  const { t } = useTranslation('book');
  const navigate = useNavigate();
  const paths = usePartnerPaths();
  const { orderId } = useParams<{ orderId: string }>();
  const redirectedRef = useRef(false);

  const accessToken = captureOrderTokenFromUrl(orderId);
  const args =
    orderId && accessToken ? { orderId: orderId as Id<'bookOrders'>, accessToken } : null;

  const progress = useQuery(api.bookPipeline.getLandingOrderProgress, args ?? 'skip');
  const styleVoteImages = useQuery(
    api.bookPipeline.getLandingStyleVoteImages,
    args && progress?.hasStyleVoteImages && !progress?.chosenStyle ? args : 'skip',
  );

  const submitVote = useMutation(api.bookPipeline.submitLandingStyleVote);
  const submitDedication = useMutation(api.bookPipeline.submitLandingParentDedication);
  const skipDedication = useMutation(api.bookPipeline.skipLandingParentDedication);

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

  // Book done → result page (preview + payment, or the download once paid).
  useEffect(() => {
    if (!progress || !orderId || redirectedRef.current) return;
    if (progress.status === 'completed') {
      redirectedRef.current = true;
      void navigate(paths.bookResult(orderId));
    }
  }, [progress, orderId, navigate, paths]);

  // Without a stored token (different browser, cleared storage) the order
  // can't be read — show not-found rather than hanging on a spinner.
  if (!args) {
    return (
      <ProgressLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
          <p className="text-sm text-gray-500">{t('progress.notFound')}</p>
        </div>
      </ProgressLayout>
    );
  }

  if (!progress) {
    return (
      <ProgressLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-6 h-6 spinner" />
        </div>
      </ProgressLayout>
    );
  }

  if (progress.status === 'failed') {
    return (
      <ProgressLayout>
        <BookErrorScreen
          error={friendlyBookError(progress.error)}
          retryLabel={t('progress.retryStart')}
          onRetry={() => void navigate(paths.start)}
        />
      </ProgressLayout>
    );
  }

  if (progress.status === 'paused') {
    return (
      <ProgressLayout>
        <BookPausedScreen />
      </ProgressLayout>
    );
  }

  // Inline: dedication form (after the vote).
  if (phase === 'dedication') {
    const handleDedicationSubmit = async (dedication: string) => {
      await submitDedication({ ...args, dedication });
      if (dedicationTimerRef.current) clearTimeout(dedicationTimerRef.current);
      setPhase('progress');
    };
    const handleDedicationSkip = async () => {
      // Even when skipped, the backend needs to know the parent has decided —
      // otherwise the composer waits in `awaiting_dedication` until auto-skip.
      await skipDedication(args);
      if (dedicationTimerRef.current) clearTimeout(dedicationTimerRef.current);
      setPhase('progress');
    };
    return (
      <ProgressLayout keepTabOpenNotice>
        <DedicationForm
          onSubmit={handleDedicationSubmit}
          onSkip={() => void handleDedicationSkip()}
        />
      </ProgressLayout>
    );
  }

  // Inline: style vote (when images are ready and not yet chosen).
  if (phase === 'vote' && styleVoteImages && !styleVoteImages.chosenStyle) {
    const handleVote = async () => {
      if (!selected || isSubmitting) return;
      setIsSubmitting(true);
      setVoteError(null);
      try {
        await submitVote({ ...args, choice: selected });
        // Drop back to the progress UI for a beat — the parent has just made a
        // choice; surfacing another form immediately feels relentless. Wait
        // ~30s of "trwa magia" before asking for a dedication.
        setPhase('progress');
        setIsSubmitting(false);
        if (dedicationTimerRef.current) clearTimeout(dedicationTimerRef.current);
        dedicationTimerRef.current = setTimeout(() => setPhase('dedication'), 30_000);
      } catch (err) {
        setVoteError(err instanceof Error ? err.message : t('vote.error'));
        setIsSubmitting(false);
      }
    };

    return (
      <ProgressLayout keepTabOpenNotice>
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

  return (
    <ProgressLayout keepTabOpenNotice>
      <ProgressJourney
        status={progress.status}
        pipelineSteps={PIPELINE_STEPS}
        childName={progress.childName}
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
    <div className="px-6 pt-10 md:pt-12">
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
  keepTabOpenNotice = false,
}: {
  children: ReactNode;
  keepTabOpenNotice?: boolean;
}) {
  return (
    <>
      <BrandHeader />
      {keepTabOpenNotice && <KeepTabOpenNotice />}
      {children}
      <BrandFooter />
    </>
  );
}
