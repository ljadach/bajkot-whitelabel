import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

export function BookStyleVote() {
  const { t } = useTranslation('book');
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();

  const [selected, setSelected] = useState<'A' | 'B' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const images = useQuery(
    api.bookPipeline.getStyleVoteImages,
    orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );

  // Redirect if style already chosen (e.g. fast mode)
  useEffect(() => {
    if (images?.chosenStyle && orderId) {
      void navigate(`/book/${orderId}/progress`, { replace: true });
    }
  }, [images?.chosenStyle, orderId, navigate]);

  const submitVote = useMutation(api.bookPipeline.submitStyleVote);

  const handleVote = async () => {
    if (!selected || !orderId || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await submitVote({
        orderId: orderId as Id<'bookOrders'>,
        choice: selected,
      });
      void navigate(`/book/${orderId}/progress`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vote failed');
      setIsSubmitting(false);
    }
  };

  if (!orderId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-muted">Order not found</p>
      </div>
    );
  }

  if (!images) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 spinner" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-ink text-center mb-2">{t('vote.heading')}</h1>
      <p className="text-sm text-muted text-center mb-8">{t('vote.description')}</p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Style A */}
        <button
          type="button"
          onClick={() => setSelected('A')}
          className={`rounded-xl border-3 p-4 text-center transition-all cursor-pointer ${
            selected === 'A'
              ? 'border-success bg-emerald-50 scale-[1.02]'
              : 'border-line hover:border-accent'
          }`}
        >
          {images.imageUrlA ? (
            <img src={images.imageUrlA} alt={t('vote.styleA')} className="w-full rounded-lg mb-3" />
          ) : (
            <div className="w-full aspect-square rounded-lg bg-bg-muted flex items-center justify-center mb-3">
              <span className="text-muted text-sm">Image A</span>
            </div>
          )}
          <span className="block font-semibold text-ink">{t('vote.styleA')}</span>
        </button>

        {/* Style B */}
        <button
          type="button"
          onClick={() => setSelected('B')}
          className={`rounded-xl border-3 p-4 text-center transition-all cursor-pointer ${
            selected === 'B'
              ? 'border-success bg-emerald-50 scale-[1.02]'
              : 'border-line hover:border-accent'
          }`}
        >
          {images.imageUrlB ? (
            <img src={images.imageUrlB} alt={t('vote.styleB')} className="w-full rounded-lg mb-3" />
          ) : (
            <div className="w-full aspect-square rounded-lg bg-bg-muted flex items-center justify-center mb-3">
              <span className="text-muted text-sm">Image B</span>
            </div>
          )}
          <span className="block font-semibold text-ink">{t('vote.styleB')}</span>
        </button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={() => void handleVote()}
          disabled={!selected || isSubmitting}
          className="rounded-lg bg-accent px-8 py-3.5 text-base font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? t('vote.confirming')
            : selected
              ? t('vote.confirm')
              : t('vote.chooseFirst')}
        </button>
      </div>
    </div>
  );
}
