import { Link } from 'react-router';
import { StepName, STEP_LABELS, STEP_TO_PATH } from '../../hooks/useStepNavigation';

interface StepBlockedProps {
  /** The step user is trying to access */
  currentStep: StepName;
  /** The step that must be completed first */
  requiredStep: StepName;
}

/**
 * Displayed when user navigates to a step they're not yet eligible for.
 * Shows a message explaining the prerequisite and a link to complete it.
 */
export function StepBlocked({ currentStep, requiredStep }: StepBlockedProps) {
  const currentLabel = STEP_LABELS[currentStep];
  const requiredLabel = STEP_LABELS[requiredStep];
  const requiredPath = STEP_TO_PATH[requiredStep];

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Message */}
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">{currentLabel} not available yet</h2>
        <p className="text-neutral-600 mb-6">
          To access this step, first complete: <span className="font-medium">{requiredLabel}</span>
        </p>

        {/* Action */}
        <Link to={requiredPath} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium transition-colors" style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' }}>
          Go to {requiredLabel}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
