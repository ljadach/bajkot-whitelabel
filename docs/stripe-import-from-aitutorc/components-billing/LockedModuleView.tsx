import { useTranslation } from 'react-i18next';

interface LockedModuleViewProps {
  pageTitle?: string;
  pageIndex: number;
  reason: 'free_unlock_available' | 'upgrade_required';
  remainingUnlocks: number;
  isLoading?: boolean;
  onBack: () => void;
  onUnlock?: () => void;
  onUpgrade: () => void;
}

export function LockedModuleView({ pageTitle, pageIndex, reason, remainingUnlocks, isLoading = false, onBack, onUnlock, onUpgrade }: LockedModuleViewProps) {
  const { t } = useTranslation('plan');
  const hasFreeUnlock = reason === 'free_unlock_available';

  return (
    <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-3xl items-center justify-center px-4 py-10">
      <div className="w-full rounded-[28px] border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="inline-flex rounded-full bg-accent-subtle px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-accent">{hasFreeUnlock ? t('billing.freeBadge', { defaultValue: 'Free unlock' }) : t('billing.lockedBadge', { defaultValue: 'Locked' })}</div>

        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-neutral-900">
          {hasFreeUnlock ? t('billing.lockedFreeTitle', { defaultValue: 'This module is available with one free unlock' }) : t('billing.lockedUpgradeTitle', { defaultValue: 'This module is part of Pro access' })}
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">
          {hasFreeUnlock
            ? t('billing.lockedFreeBody', {
                defaultValue: 'You can open any two modules for free. Use one unlock here or upgrade to keep the whole course open.',
              })
            : t('billing.lockedUpgradeBody', {
                defaultValue: 'You have used your free unlocks. Upgrade to Pro to continue with the remaining modules.',
              })}
        </p>

        <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{t('billing.moduleLabel', { defaultValue: 'Module' })}</div>
          <div className="mt-2 text-lg font-semibold text-neutral-900">{pageTitle || t('card.moduleNumber', { number: pageIndex + 1 })}</div>
          <div className="mt-2 text-sm text-neutral-600">{hasFreeUnlock ? t('billing.unlocksRemaining', { defaultValue: '{{count}} free unlocks remaining', count: remainingUnlocks }) : t('billing.unlocksUsed', { defaultValue: 'Your two free unlocks are already used.' })}</div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {hasFreeUnlock && onUnlock ? (
            <button onClick={onUnlock} disabled={isLoading} className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60">
              {t('billing.unlockFreeCta', { defaultValue: 'Unlock free' })}
            </button>
          ) : null}

          <button onClick={onUpgrade} disabled={isLoading} className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60">
            {isLoading ? t('billing.redirecting', { defaultValue: 'Redirecting...' }) : t('billing.upgradeCta', { defaultValue: 'Upgrade to Pro' })}
          </button>

          <button
            onClick={onBack}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('common:buttons.back', { defaultValue: 'Back' })}
          </button>
        </div>
      </div>
    </div>
  );
}
