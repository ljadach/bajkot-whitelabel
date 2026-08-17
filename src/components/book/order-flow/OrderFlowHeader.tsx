import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../../BrandLogo';

const TOTAL_STEPS = 2;

/**
 * Fixed header for the standalone landing order page (/problem/:slug/zamow).
 * The back button steps backwards through the flow (mirroring browser back —
 * steps live in the URL); from step 1 it leaves to the topic LP. Screens keep
 * their pt-28 clearance, same as under the LP navs.
 * Memoized: the flow re-renders on every keystroke, the header only on step.
 */
export const OrderFlowHeader = memo(function OrderFlowHeader({
  onBack,
  step,
}: {
  onBack: () => void;
  step: number;
}) {
  const { t } = useTranslation('book');
  const stepLabels = [t('flowHeader.step1'), t('flowHeader.step2')];

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-calm-700 hover:text-calm-900 transition shrink-0 cursor-pointer"
        >
          <i className="fa-solid fa-arrow-left text-sm" aria-hidden="true" />
          <BrandLogo withTagline={false} className="hidden sm:block" />
          <span className="sm:hidden font-bold text-sm">{t('flowHeader.back')}</span>
        </button>

        {/* Mobile: just the current step name — with two steps a "Krok 1 z 2"
            counter carries no information the progress bar doesn't. */}
        <div className="md:hidden text-sm font-bold text-magic-600">{stepLabels[step - 1]}</div>

        {/* Desktop: both step labels with the active one highlighted. */}
        <ol className="hidden md:flex items-center gap-2 text-xs font-bold">
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const state =
              n === step ? 'text-magic-600' : n < step ? 'text-calm-500' : 'text-gray-400';
            return (
              <li key={label} className="flex items-center gap-2">
                {i > 0 && <i className="fa-solid fa-chevron-right text-calm-200 text-[0.6rem]" />}
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
          className="h-full bg-magic-500 transition-all duration-300"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>
    </header>
  );
});
