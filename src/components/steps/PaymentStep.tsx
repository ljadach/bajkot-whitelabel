import { useState, useMemo } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAnalytics, generateProfileHash } from '@lib/telemetry';
import { Spinner } from '../common/Spinner';

interface PaymentStepProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- profile shape varies across steps
  profile: any;
}

export function PaymentStep({ profile }: PaymentStepProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const updatePaymentStatus = useMutation(api.profiles.updatePaymentStatus);
  const { track, getSessionId } = useAnalytics();

  const outlinePages = useMemo(() => parsePlanOutline(profile?.planOutline), [profile?.planOutline]);
  const includedModules = outlinePages.length;

  const handlePayment = async () => {
    setIsProcessing(true);

    // PRD Section 8: Track checkout_started
    track('checkout_started', {
      session_id: getSessionId(),
      step: 'payment',
      module_count: includedModules,
      profile_hash: generateProfileHash(profile.profileXml || ''),
    });

    try {
      // Simulate payment processing
      // @Product: demo payment only; replace with real checkout + backend confirmation before marking completed.
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await updatePaymentStatus({
        status: 'completed',
        sessionId: `sim_${Date.now()}`,
      });

      // PRD Section 8: Track checkout_completed
      track('checkout_completed', {
        session_id: getSessionId(),
        step: 'payment',
        module_count: includedModules,
        profile_hash: generateProfileHash(profile.profileXml || ''),
      });
    } catch (error) {
      console.error('Payment error:', error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Purchase</h2>
          <p className="text-gray-600">You're one step away from starting your personalized learning journey!</p>
        </div>

        <div className="bg-accent-subtle rounded-lg p-4 mb-6 border border-accent/10">
          <h3 className="font-semibold text-ink mb-2">Order Summary</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-ink">AITutoro Pro</div>
              <div className="text-sm text-muted">Monthly subscription • {includedModules} modules included</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-accent">$20</div>
              <div className="text-sm text-muted">per month</div>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <h4 className="font-medium text-ink">What's included</h4>
          <ul className="space-y-1 text-sm text-muted">
            <li>Personalized training program + updates for a month</li>
            <li>Quick wins and tailored modules</li>
            <li>Privacy-friendly analytics (no resale of your data)</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-medium text-blue-900">Demo Payment</h4>
              <p className="text-sm text-blue-800">This is a demonstration. No actual payment will be processed.</p>
            </div>
          </div>
        </div>

        <button onClick={() => void handlePayment()} disabled={isProcessing} className="w-full bg-accent text-white py-4 rounded-container font-semibold text-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {isProcessing ? (
            <div className="flex items-center justify-center space-x-2">
              <Spinner size="md" variant="light" />
              <span>Processing Payment...</span>
            </div>
          ) : (
            'Complete Purchase - $20/month'
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">By completing this purchase, you agree to our Terms of Service and Privacy Policy.</p>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic JSON from LLM
function parsePlanOutline(raw?: string | null): any[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
