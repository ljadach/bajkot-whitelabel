import { useTranslation } from 'react-i18next';

interface UpgradePromptProps {
  pageTitle?: string;
  pageIndex: number;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UpgradePrompt({ pageTitle, pageIndex, isLoading = false, onConfirm, onCancel }: UpgradePromptProps) {
  const { t } = useTranslation('plan');

  return (
    <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
      <div className="mb-4">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{t('billing.proBadge', { defaultValue: 'Pro required' })}</div>
        <h3 className="mt-2 text-xl font-semibold text-neutral-900">{t('billing.upgradePromptTitle', { defaultValue: 'Unlock the full course' })}</h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          {t('billing.upgradePromptBody', {
            defaultValue: 'Upgrade to Pro to open every module, keep future lessons unlocked, and manage your subscription from settings.',
          })}
        </p>
      </div>

      <div className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
        <div className="font-medium text-neutral-900">{pageTitle || t('card.moduleNumber', { number: pageIndex + 1 })}</div>
        <div className="mt-1">{t('billing.upgradePromptMeta', { defaultValue: 'Two modules stay free. The rest unlock with Pro.' })}</div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button onClick={onConfirm} disabled={isLoading} className="inline-flex flex-1 items-center justify-center rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60">
          {isLoading ? t('billing.redirecting', { defaultValue: 'Redirecting...' }) : t('billing.upgradeCta', { defaultValue: 'Upgrade to Pro' })}
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
