import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../convex/_generated/api';
import { captureTokenFromUrl, getAccessToken } from '../../../hooks/useAccessToken';
import type { Topic } from '../../../data/topics';
import { OrderWizard } from './OrderWizard';
import { OrderPreview } from './OrderPreview';
import { OrderCheckout, type CheckoutSubmitPayload } from './OrderCheckout';
import { INITIAL_INTAKE, intakeToOrderArgs, type IntakeState, type OrderFormat } from './types';

type Screen = 'wizard' | 'preview' | 'checkout';

/**
 * Landing order flow: topic preselected from URL, no catalog screen.
 * wizard → preview → checkout. Stripe checkout on submit.
 */
export function LandingOrderFlow({ topic }: { topic: Topic }) {
  const { t } = useTranslation('book');
  const navigate = useNavigate();
  const startLandingOrder = useAction(api.bookPipeline.startLandingOrder);

  const [screen, setScreen] = useState<Screen>('wizard');
  const [intake, setIntake] = useState<IntakeState>(() => ({
    ...INITIAL_INTAKE,
    topic,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Capture access token on mount (preserves landing-flow token gate).
  useEffect(() => captureTokenFromUrl(), []);

  // Re-sync if user navigates between topic pages (defensive).
  useEffect(() => {
    setIntake((prev) => ({ ...prev, topic }));
  }, [topic]);

  const handleChangeFormat = useCallback((format: OrderFormat) => {
    setIntake((prev) => ({ ...prev, format }));
  }, []);

  const handleCheckoutSubmit = useCallback(
    async (payload: CheckoutSubmitPayload) => {
      if (!intake.topic || !intake.age || !intake.gender) {
        setSubmitError(t('flow.errorMissingData'));
        return;
      }
      setSubmitting(true);
      setSubmitError(null);
      try {
        const baseArgs = intakeToOrderArgs(intake, {
          email: payload.email,
          format: payload.format,
          shippingAddress: payload.shippingAddress,
        });
        const result = await startLandingOrder({
          accessToken: getAccessToken() ?? '',
          ...baseArgs,
        });

        const orderId = result.orderId;

        // PDF+Print → landing trapdoor thank-you
        if (payload.format === 'pdf_print') {
          void navigate(`/landing/book/${orderId}/print-thanks`);
          return;
        }

        // Landing flow currently doesn't have authenticated Stripe (Stripe
        // action requires identity). Until landing checkout is wired through
        // Stripe Connect / a public hosted checkout, we route directly to
        // progress and let the pipeline run. TODO(c3z): wire landing payment.
        void navigate(`/landing/book/${orderId}/progress`);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : t('flow.errorGeneric'));
        setSubmitting(false);
      }
    },
    [intake, startLandingOrder, navigate, t],
  );

  // Landing has no admin (clerkUserId is "landing-user"). Dev flags hidden.
  const isAdmin = false;

  return (
    <>
      {screen === 'wizard' && (
        <OrderWizard
          intake={intake}
          onChange={setIntake}
          onSubmit={() => {
            setScreen('preview');
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onChangeTopic={() => {
            // Landing: go back to the topic page itself.
            void navigate(`/problem/${topic.slug}`);
          }}
          showProgressNav={false}
        />
      )}
      {screen === 'preview' && (
        <OrderPreview
          intake={intake}
          onChangeFormat={handleChangeFormat}
          onContinue={() => {
            setScreen('checkout');
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onBack={() => setScreen('wizard')}
        />
      )}
      {screen === 'checkout' && (
        <OrderCheckout
          intake={intake}
          onChangeFormat={handleChangeFormat}
          onSubmit={handleCheckoutSubmit}
          onBack={() => setScreen('preview')}
          isAdmin={isAdmin}
          isSubmitting={submitting}
          externalError={submitError}
        />
      )}
    </>
  );
}
