import { useTranslation } from 'react-i18next';

interface FreeUnlockPromptProps {
  pageTitle?: string;
  pageIndex: number;
  remainingUnlocks: number;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FreeUnlockPrompt({ pageTitle, pageIndex, remainingUnlocks, isLoading = false, onConfirm, onCancel }: FreeUnlockPromptProps) {
  const { t } = useTranslation('plan');

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl max-w-md w-full">
      <div className="mb-4">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">{t('billing.freeBadge', { defaultValue: 'Free unlock' })}</div>
        <h3 className="mt-2 text-xl font-semibold text-neutral-900">{t('billing.freePromptTitle', { defaultValue: 'Unlock this module for free?' })}</h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          {t('billing.freePromptBody', {
            defaultValue: 'Use one of your free unlocks to open this module. Your choice is saved for this course.',
          })}
        </p>
      </div>

      <div className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
        <div className="font-medium text-neutral-900">{pageTitle || t('card.moduleNumber', { number: pageIndex + 1 })}</div>
        <div className="mt-1">{t('billing.unlocksRemaining', { defaultValue: '{{count}} free unlocks remaining', count: remainingUnlocks })}</div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button onClick={onConfirm} disabled={isLoading} className="inline-flex flex-1 items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60">
          {isLoading ? t('billing.unlocking', { defaultValue: 'Unlocking...' }) : t('billing.unlockFreeCta', { defaultValue: 'Unlock free' })}
        </button>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t('common:buttons.cancel', { defaultValue: 'Cancel' })}
        </button>
      </div>
    </div>
  );
}
