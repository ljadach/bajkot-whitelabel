import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '../common/Spinner';

interface RegenerateBarProps {
  /** Callback when user confirms regeneration */
  onRegenerate: () => void | Promise<void>;
  /** Optional timestamp of when content was generated */
  generatedAt?: number;
  /** Whether regeneration is in progress */
  isRegenerating?: boolean;
  /** Custom label for the regenerate action */
  label?: string;
}

/**
 * Subtle gray bar at the bottom of a completed step.
 * Allows user to regenerate the content for that step.
 */
export function RegenerateBar({ onRegenerate, generatedAt, isRegenerating = false, label }: RegenerateBarProps) {
  const { t } = useTranslation('common');
  const [showConfirm, setShowConfirm] = useState(false);
  const displayLabel = label ?? t('buttons.regenerate');

  const handleClick = () => {
    if (isRegenerating) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    await onRegenerate();
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('time.today');
    } else if (diffDays === 1) {
      return t('time.yesterday');
    } else if (diffDays < 7) {
      return t('time.daysAgo', { count: diffDays });
    } else {
      return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    }
  };

  if (showConfirm) {
    return (
      <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-600">{t('regenerate.confirmMessage')}</p>
          <div className="flex items-center gap-2">
            <button onClick={handleCancel} className="px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
              {t('buttons.cancel')}
            </button>
            <button onClick={() => void handleConfirm()} className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded-md hover:bg-neutral-800 transition-colors">
              {t('regenerate.confirmButton')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-2.5">
      <div className="max-w-[1100px] mx-auto flex items-center justify-center gap-2">
        {generatedAt && <span className="text-xs text-neutral-400">{t('regenerate.generatedAt', { date: formatDate(generatedAt) })}</span>}
        {generatedAt && <span className="text-neutral-300">•</span>}
        <button onClick={handleClick} disabled={isRegenerating} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
          {isRegenerating ? (
            <>
              <Spinner size="xs" />
              {t('regenerate.generating')}
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {displayLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
