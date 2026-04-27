import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { DedicationForm } from './DedicationForm';

export function BookStyleVote() {
  const { t } = useTranslation('book');
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const votedRef = useRef(false);

  const [selected, setSelected] = useState<'A' | 'B' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'vote' | 'dedication'>('vote');

  const images = useQuery(
    api.bookPipeline.getStyleVoteImages,
    orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );

  const goToProgress = () => {
    votedRef.current = true;
    void navigate(`/book/${orderId}/progress`, { replace: true });
  };

  // If style was already chosen server-side (fast mode / reopen), skip the
  // dedication step — we only prompt for dedication immediately after a vote.
  useEffect(() => {
    if (images?.chosenStyle && orderId && !votedRef.current && phase === 'vote') {
      goToProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images?.chosenStyle, orderId, phase]);

  const submitVote = useMutation(api.bookPipeline.submitStyleVote);
  const submitDedication = useMutation(api.bookPipeline.submitParentDedication);

  const handleVote = async () => {
    if (!selected || !orderId || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await submitVote({
        orderId: orderId as Id<'bookOrders'>,
        choice: selected,
      });
      setPhase('dedication');
      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vote failed');
      setIsSubmitting(false);
    }
  };

  const handleDedicationSubmit = async (dedication: string) => {
    if (!orderId) return;
    await submitDedication({ orderId: orderId as Id<'bookOrders'>, dedication });
    goToProgress();
  };

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Order not found</p>
      </div>
    );
  }

  if (!images) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 spinner" />
      </div>
    );
  }

  if (phase === 'dedication') {
    return <DedicationForm onSubmit={handleDedicationSubmit} onSkip={goToProgress} />;
  }

  return (
    <StyleVoteCards
      imageUrlA={images.imageUrlA ?? null}
      imageUrlB={images.imageUrlB ?? null}
      selected={selected}
      onSelect={setSelected}
      onConfirm={() => void handleVote()}
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

export interface StyleVoteCardsProps {
  imageUrlA: string | null;
  imageUrlB: string | null;
  selected: 'A' | 'B' | null;
  onSelect: (choice: 'A' | 'B') => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  error: string | null;
  labels: {
    kicker: string;
    heading: string;
    description: string;
    styleA: string;
    styleADesc: string;
    styleB: string;
    styleBDesc: string;
    confirm: string;
    confirming: string;
    chooseFirst: string;
  };
}

/**
 * Reusable card grid for the A/B style vote — used by both auth and landing
 * flows. Keeps the visual layout identical between the two.
 */
export function StyleVoteCards({
  imageUrlA,
  imageUrlB,
  selected,
  onSelect,
  onConfirm,
  isSubmitting,
  error,
  labels,
}: StyleVoteCardsProps) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-magic-500 font-bold uppercase tracking-widest text-sm mb-2 block">
            {labels.kicker}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-calm-900 mb-3">{labels.heading}</h1>
          <p className="text-gray-600 text-base md:text-lg max-w-xl mx-auto">
            {labels.description}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
          {(['A', 'B'] as const).map((choice) => {
            const url = choice === 'A' ? imageUrlA : imageUrlB;
            const title = choice === 'A' ? labels.styleA : labels.styleB;
            const desc = choice === 'A' ? labels.styleADesc : labels.styleBDesc;
            const isSelected = selected === choice;
            return (
              <button
                key={choice}
                type="button"
                onClick={() => onSelect(choice)}
                className={`relative rounded-3xl overflow-hidden border-2 bg-white text-left transition-all shadow-sm hover:shadow-xl ${
                  isSelected
                    ? 'border-magic-500 ring-4 ring-magic-400/20 scale-[1.02]'
                    : 'border-gray-100 hover:border-calm-500'
                }`}
              >
                {url ? (
                  <img src={url} alt={title} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-calm-50 flex items-center justify-center text-gray-400 text-sm font-semibold">
                    Ładowanie...
                  </div>
                )}
                <div className="p-4">
                  <div className="font-black text-calm-900 text-base">{title}</div>
                  <div className="text-xs text-gray-500 font-semibold">{desc}</div>
                </div>
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-magic-500 text-white rounded-full w-9 h-9 flex items-center justify-center shadow-lg">
                    <i className="fa-solid fa-check" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!selected || isSubmitting}
            className="bg-magic-500 hover:bg-magic-600 text-white font-bold px-10 py-4 rounded-2xl text-lg shadow-xl shadow-magic-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? labels.confirming : selected ? labels.confirm : labels.chooseFirst}
          </button>
        </div>
      </div>
    </div>
  );
}
