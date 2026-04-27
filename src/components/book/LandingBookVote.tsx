import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { DedicationForm } from './DedicationForm';
import { StyleVoteCards } from './BookStyleVote';

export function LandingBookVote() {
  const { t } = useTranslation('book');
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const submitVote = useMutation(api.bookPipeline.submitLandingStyleVote);
  const submitDedication = useMutation(api.bookPipeline.submitLandingParentDedication);
  const redirectedRef = useRef(false);
  const [phase, setPhase] = useState<'vote' | 'dedication'>('vote');
  const [selected, setSelected] = useState<'A' | 'B' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const data = useQuery(
    api.bookPipeline.getLandingStyleVoteImages,
    orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );

  const goToProgress = () => {
    redirectedRef.current = true;
    void navigate(`/landing/book/${orderId}/progress`);
  };

  // If style was already chosen server-side (reopen), skip dedication —
  // we only prompt for it immediately after the user casts a vote.
  useEffect(() => {
    if (data?.chosenStyle && orderId && !redirectedRef.current && phase === 'vote') {
      goToProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, orderId, phase]);

  if (!orderId || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 spinner" />
      </div>
    );
  }

  if (phase === 'dedication') {
    return (
      <DedicationForm
        onSubmit={async (dedication) => {
          await submitDedication({ orderId: orderId as Id<'bookOrders'>, dedication });
          goToProgress();
        }}
        onSkip={goToProgress}
      />
    );
  }

  if (data.chosenStyle) return null;

  const handleConfirm = async () => {
    if (!selected || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await submitVote({ orderId: orderId as Id<'bookOrders'>, choice: selected });
      setPhase('dedication');
      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vote failed');
      setIsSubmitting(false);
    }
  };

  return (
    <StyleVoteCards
      imageUrlA={data.imageUrlA ?? null}
      imageUrlB={data.imageUrlB ?? null}
      selected={selected}
      onSelect={setSelected}
      onConfirm={() => void handleConfirm()}
      isSubmitting={isSubmitting}
      error={error}
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
