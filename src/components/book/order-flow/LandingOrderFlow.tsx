import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../convex/_generated/api';
import { captureTokenFromUrl, getAccessToken } from '../../../hooks/useAccessToken';
import { saveLandingOrderToken } from '../../../hooks/useLandingOrderToken';
import type { Topic } from '../../../data/topics';
import { setFunnelSuperProperties, trackEvent } from '../../../lib/telemetry';
import { extractErrorMessage } from '../../../lib/convexErrors';
import { OrderWizard } from './OrderWizard';
import { OrderPreview } from './OrderPreview';
import { OrderCheckout, type CheckoutSubmitPayload } from './OrderCheckout';
import {
  INITIAL_INTAKE,
  buildConsentsPayload,
  intakeToOrderArgs,
  type IntakeState,
  type OrderFormat,
} from './types';

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

  // Capture access token on mount (preserves landing-flow intake gate).
  useEffect(() => captureTokenFromUrl(), []);

  // Topic is preselected via URL — record a `topic_selected` per spec
  // section 7 so the funnel has a single source of truth for "topic
  // committed", regardless of catalog vs. topic-landing entry.
  useEffect(() => {
    trackEvent('topic_selected', {
      flow: 'landing',
      problemId: topic.slug,
      isCustom: false,
    });
  }, [topic.slug]);

  // Re-sync if user navigates between topic pages (defensive).
  useEffect(() => {
    setIntake((prev) => ({ ...prev, topic }));
  }, [topic]);

  const handleChangeFormat = useCallback((format: OrderFormat) => {
    setIntake((prev) => ({ ...prev, format }));
  }, []);

  const submitOrder = useCallback(
    async (
      checkoutPayload: CheckoutSubmitPayload,
    ): Promise<{ orderId: string; format: OrderFormat } | null> => {
      if (!intake.topic || !intake.age || !intake.gender) {
        setSubmitError(t('flow.errorMissingData'));
        return null;
      }
      setSubmitting(true);
      setSubmitError(null);
      try {
        const baseArgs = intakeToOrderArgs(intake, {
          email: checkoutPayload.email,
          format: checkoutPayload.format,
          shippingAddress: checkoutPayload.shippingAddress,
          consents: buildConsentsPayload(checkoutPayload.consents),
        });
        const result = await startLandingOrder({
          accessToken: getAccessToken() ?? '',
          ...baseArgs,
        });
        const orderId = result.orderId;
        // Persist the per-order capability token so subsequent screens can
        // read the order. Without this, even the same browser would be
        // locked out of progress/result/vote/dedication.
        saveLandingOrderToken(orderId, result.accessToken);
        setFunnelSuperProperties({ bookOrderId: orderId, flow: 'landing' });
        return { orderId, format: checkoutPayload.format };
      } catch (err) {
        setSubmitError(extractErrorMessage(err, t('flow.errorGeneric')));
        setSubmitting(false);
        return null;
      }
    },
    [intake, startLandingOrder, t],
  );

  const handlePreviewContinue = useCallback(() => {
    setScreen('checkout');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCheckoutSubmit = useCallback(
    async (payload: CheckoutSubmitPayload) => {
      const result = await submitOrder(payload);
      if (!result) return;
      // Both PDF and PDF+Print run the pipeline; payment (49 vs 99 PLN) and
      // print-shipping are handled post-pipeline on the result page.
      void navigate(`/landing/book/${result.orderId}/progress`);
    },
    [submitOrder, navigate],
  );

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
            // Landing user is already on `/problem/<slug>` — sending them
            // back to the same URL would no-op. Send them to the standalone
            // catalog where they can pick a different topic.
            void navigate('/katalog');
          }}
          showProgressNav={false}
        />
      )}
      {screen === 'preview' && (
        <OrderPreview
          intake={intake}
          onChangeFormat={handleChangeFormat}
          onContinue={handlePreviewContinue}
          onBack={() => setScreen('wizard')}
        />
      )}
      {screen === 'checkout' && (
        <OrderCheckout
          intake={intake}
          onChangeFormat={handleChangeFormat}
          onSubmit={handleCheckoutSubmit}
          onBack={() => setScreen('preview')}
          isSubmitting={submitting}
          externalError={submitError}
        />
      )}
    </>
  );
}
