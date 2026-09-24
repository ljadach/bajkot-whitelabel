import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../../BrandLogo';

const TOTAL_STEPS = 3;

/**
 * Fixed header for the order flow: topic picker (step 1), then the order form
 * (steps 2–3, which live in the URL as ?krok=). With `onBack` the logo doubles
 * as a back button (mirroring browser back); without it — on the picker,
 * where there is nothing to go back to — it's just the logo. Screens keep
 * pt-28 clearance below it.
 * Memoized: the flow re-renders on every keystroke, the header only on step.
 */
export const OrderFlowHeader = memo(function OrderFlowHeader({
  onBack,
  step,
}: {
  onBack?: () => void;
  step: 1 | 2 | 3;
}) {
  const { t } = useTranslation('book');
  const stepLabels = [t('flowHeader.step1'), t('flowHeader.step2'), t('flowHeader.step3')];

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-primary-700 hover:text-primary-900 transition shrink-0 cursor-pointer"
          >
            <i className="fa-solid fa-arrow-left text-sm" aria-hidden="true" />
            <BrandLogo withTagline={false} className="hidden sm:inline-flex" />
            <span className="sm:hidden font-bold text-sm">{t('flowHeader.back')}</span>
          </button>
        ) : (
          <BrandLogo withTagline={false} className="shrink-0" />
        )}

        {/* Mobile: the current step only. */}
        <div className="md:hidden text-sm font-bold text-accent-ink">
          {t('flowHeader.step', { current: step, total: TOTAL_STEPS })}: {stepLabels[step - 1]}
        </div>

        {/* Desktop: every step label with the active one highlighted. */}
        <ol className="hidden md:flex items-center gap-2 text-xs font-bold">
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const state =
              n === step ? 'text-accent-ink' : n < step ? 'text-primary-ink' : 'text-gray-400';
            return (
              <li key={label} className="flex items-center gap-2">
                {i > 0 && (
                  <i className="fa-solid fa-chevron-right text-primary-200 text-[0.6rem]" />
                )}
                <span className={state} aria-current={n === step ? 'step' : undefined}>
                  {n}. {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Thin progress bar under the bar — fills with flow progress. */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-accent-500 transition-all duration-300"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>
    </header>
  );
});
