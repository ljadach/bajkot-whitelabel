import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { PIPELINE_STEPS } from '@lib/bookData';
import { friendlyBookError } from '@lib/bookErrors';
import { BookErrorScreen, BookPausedScreen, ProgressJourney } from './ProgressJourney';
import { StyleVoteCards } from './BookStyleVote';
import { DedicationForm } from './DedicationForm';

type InlinePhase = 'progress' | 'vote' | 'dedication';

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

  // Inline vote state — vote becomes available when pipeline reports both
  // style images ready (~30% spec hint, but actual % depends on agent stage).
  const styleVoteImages = useQuery(
    api.bookPipeline.getLandingStyleVoteImages,
    orderId && progress?.hasStyleVoteImages && !progress?.chosenStyle
      ? { orderId: orderId as Id<'bookOrders'> }
      : 'skip',
  );

  const submitVote = useMutation(api.bookPipeline.submitLandingStyleVote);
  const submitDedication = useMutation(api.bookPipeline.submitLandingParentDedication);

  const [phase, setPhase] = useState<InlinePhase>('progress');
  const [selected, setSelected] = useState<'A' | 'B' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

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

  // Inline: dedication form (after vote submitted).
  if (phase === 'dedication') {
    const handleDedicationSubmit = async (dedication: string) => {
      if (!orderId) return;
      await submitDedication({ orderId: orderId as Id<'bookOrders'>, dedication });
      setPhase('progress');
    };
    return <DedicationForm onSubmit={handleDedicationSubmit} onSkip={() => setPhase('progress')} />;
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
        setPhase('dedication');
        setIsSubmitting(false);
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
      events={events ?? undefined}
      childName={progress.childName}
      ageNumber={progress.ageNumber}
      problemId={progress.problemId}
    />
  );
}
