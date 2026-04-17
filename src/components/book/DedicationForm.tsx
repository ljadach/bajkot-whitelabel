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
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-ink text-center mb-2">
        {t('dedication.heading')}
      </h1>
      <p className="text-sm text-muted text-center mb-6">{t('dedication.description')}</p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('dedication.placeholder')}
        maxLength={MAX_LENGTH}
        rows={4}
        disabled={busy}
        className="w-full rounded-lg border-2 border-line bg-bg px-3 py-2.5 text-base focus:border-accent focus:outline-none resize-none disabled:opacity-60"
      />
      <div className="mt-1 flex justify-end text-xs text-muted">
        {trimmed.length} / {MAX_LENGTH}
      </div>

      <div className="mt-4 flex gap-3 justify-center">
        <button
          type="button"
          onClick={onSkip}
          disabled={busy}
          className="rounded-lg border-2 border-line bg-bg px-6 py-3 text-base font-semibold text-ink hover:border-accent transition-colors disabled:opacity-50"
        >
          {t('dedication.skip')}
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="rounded-lg bg-accent px-6 py-3 text-base font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? t('dedication.saving') : t('dedication.submit')}
        </button>
      </div>
    </div>
  );
}
