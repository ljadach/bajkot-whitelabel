import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { DedicationForm } from './DedicationForm';

export function LandingBookVote() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const submitVote = useMutation(api.bookPipeline.submitLandingStyleVote);
  const submitDedication = useMutation(api.bookPipeline.submitLandingParentDedication);
  const redirectedRef = useRef(false);
  const [phase, setPhase] = useState<'vote' | 'dedication'>('vote');

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
      <div className="flex items-center justify-center min-h-[400px]">
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

  const handleVote = async (choice: 'A' | 'B') => {
    await submitVote({ orderId: orderId as Id<'bookOrders'>, choice });
    setPhase('dedication');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-ink text-center mb-2">Wybierz styl ilustracji</h1>
      <p className="text-sm text-muted text-center mb-8">
        Kliknij styl, który lepiej pasuje do bajki Twojego dziecka.
      </p>
      <div className="grid md:grid-cols-2 gap-6">
        {(['A', 'B'] as const).map((choice) => {
          const url = choice === 'A' ? data.imageUrlA : data.imageUrlB;
          const label = choice === 'A' ? 'Styl A — Mieszany' : 'Styl B — Akwarela';
          return (
            <button
              key={choice}
              onClick={() => void handleVote(choice)}
              className="rounded-2xl border-2 border-neutral-200 overflow-hidden hover:border-accent hover:shadow-lg transition-all group"
            >
              {url ? (
                <img src={url} alt={label} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-neutral-100 flex items-center justify-center text-muted">
                  Ładowanie...
                </div>
              )}
              <div className="p-4 text-center">
                <span className="font-bold text-ink group-hover:text-accent transition-colors">
                  {label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
