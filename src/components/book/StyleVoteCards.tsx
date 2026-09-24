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
 * A/B illustration-style vote, rendered inline on the progress page when the
 * pipeline has produced both style samples.
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
          <span className="text-accent-ink font-bold uppercase tracking-widest text-sm mb-2 block">
            {labels.kicker}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-primary-900 mb-3">
            {labels.heading}
          </h1>
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
                    ? 'border-accent-500 ring-4 ring-accent-400/20 scale-[1.02]'
                    : 'border-gray-100 hover:border-primary-500'
                }`}
              >
                {url ? (
                  <img src={url} alt={title} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-primary-50 flex items-center justify-center text-gray-400 text-sm font-semibold">
                    Ładowanie...
                  </div>
                )}
                <div className="p-4">
                  <div className="font-black text-primary-900 text-base">{title}</div>
                  <div className="text-xs text-gray-500 font-semibold">{desc}</div>
                </div>
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-accent-500 text-on-accent rounded-full w-9 h-9 flex items-center justify-center shadow-lg">
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
            className="bg-accent-500 hover:bg-accent-600 text-on-accent font-bold px-10 py-4 rounded-2xl text-lg shadow-xl shadow-accent-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? labels.confirming : selected ? labels.confirm : labels.chooseFirst}
          </button>
        </div>
      </div>
    </div>
  );
}
