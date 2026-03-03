import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { StepName, STEP_TO_PATH } from '../../hooks/useStepNavigation';

interface ContinueBarProps {
  /** The next step to navigate to */
  nextStep: StepName;
  /** Optional custom label override */
  label?: string;
}

/**
 * Prominent bar shown when a step is complete.
 * Provides clear call-to-action to continue to the next step.
 */
export function ContinueBar({ nextStep, label }: ContinueBarProps) {
  const { t } = useTranslation('common');
  const nextLabel = label ?? t(`steps.${nextStep}`);
  const nextPath = STEP_TO_PATH[nextStep];

  return (
    <div data-testid="continue-bar" className="border-t border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-4">
      <div className="max-w-[1100px] mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm font-medium text-neutral-700">{t('stepComplete')}</span>
        </div>

        <Link to={nextPath} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' }}>
          {t('continueTo', { step: nextLabel })}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
