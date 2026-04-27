import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const MAX_LENGTH = 200;

interface DedicationFormProps {
  onSubmit: (dedication: string) => Promise<void>;
  onSkip: () => void;
}

export function DedicationForm({ onSubmit, onSkip }: DedicationFormProps) {
  const { t } = useTranslation('book');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const canSubmit = !busy && trimmed.length > 0 && trimmed.length <= MAX_LENGTH;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-magic-100 text-magic-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-5">
            <i className="fa-solid fa-pen-nib" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-calm-900 mb-3">
            {t('dedication.heading')}
          </h1>
          <p className="text-gray-600 text-base max-w-md mx-auto">{t('dedication.description')}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8">
          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('dedication.placeholder')}
            maxLength={MAX_LENGTH}
            rows={5}
            disabled={busy}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 focus:bg-white outline-none transition font-semibold text-base resize-none disabled:opacity-60"
          />
          <div className="mt-1 flex justify-end text-xs text-gray-400 font-bold">
            {trimmed.length} / {MAX_LENGTH}
          </div>

          <div className="mt-6 flex gap-4">
            <button
              type="button"
              onClick={onSkip}
              disabled={busy}
              className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition disabled:opacity-50"
            >
              {t('dedication.skip')}
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className="w-2/3 bg-magic-500 hover:bg-magic-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-magic-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fa-solid fa-heart mr-2" />
              {busy ? t('dedication.saving') : t('dedication.submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
