import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAction, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../convex/_generated/api';
import { captureTokenFromUrl, getAccessToken } from '../../../hooks/useAccessToken';
import type { Topic } from '../../../data/topics';
import { setFunnelSuperProperties, trackEvent } from '../../../lib/telemetry';
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
  const isAdmin = useQuery(api.auth.isAdmin) ?? false;

  const [screen, setScreen] = useState<Screen>('wizard');
  const [intake, setIntake] = useState<IntakeState>(() => ({
    ...INITIAL_INTAKE,
    topic,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // DEV: admin diagnostic flags. Default true so smoke tests are fast.
  // fastImage default OFF — non-obvious UX, opt-in only.
  // TODO(c3z): pre-launch cleanup
  const [skipStripe, setSkipStripe] = useState(true);
  const [skipQa, setSkipQa] = useState(true);
  const [fastImage, setFastImage] = useState(false);

  // Capture access token on mount (preserves landing-flow token gate).
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
      checkoutPayload: CheckoutSubmitPayload | null,
    ): Promise<{ orderId: string; format: OrderFormat } | null> => {
      if (!intake.topic || !intake.age || !intake.gender) {
        setSubmitError(t('flow.errorMissingData'));
        return null;
      }
      setSubmitting(true);
      setSubmitError(null);
      try {
        const baseArgs = intakeToOrderArgs(intake, {
          email: checkoutPayload?.email,
          format: checkoutPayload?.format ?? intake.format,
          shippingAddress: checkoutPayload?.shippingAddress,
        });
        const result = await startLandingOrder({
          accessToken: getAccessToken() ?? '',
          ...baseArgs,
          // DEV shortcuts — pre-launch they're honored for every caller.
          // TODO(c3z): pre-launch cleanup
          skipStripe: skipStripe ? true : undefined,
          skipQaReviews: skipQa ? true : undefined,
          fastImage: fastImage ? true : undefined,
        });
        const orderId = result.orderId;
        setFunnelSuperProperties({ bookOrderId: orderId, flow: 'landing' });
        return { orderId, format: checkoutPayload?.format ?? intake.format };
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : t('flow.errorGeneric'));
        setSubmitting(false);
        return null;
      }
    },
    [intake, startLandingOrder, skipStripe, skipQa, fastImage, t],
  );

  // Admin shortcut on Preview CTA: skipStripe ON → submit directly.
  const handlePreviewContinue = useCallback(async () => {
    if (isAdmin && skipStripe) {
      const result = await submitOrder(null);
      if (!result) return;
      if (result.format === 'pdf_print') {
        void navigate(`/landing/book/${result.orderId}/print-thanks`);
        return;
      }
      void navigate(`/landing/book/${result.orderId}/progress`);
      return;
    }
    setScreen('checkout');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isAdmin, skipStripe, submitOrder, navigate]);

  const handleCheckoutSubmit = useCallback(
    async (payload: CheckoutSubmitPayload) => {
      const result = await submitOrder(payload);
      if (!result) return;
      // PDF+Print → landing trapdoor thank-you (manual fulfillment via mail).
      if (payload.format === 'pdf_print') {
        void navigate(`/landing/book/${result.orderId}/print-thanks`);
        return;
      }
      // Stripe payment moved to the result page (post-pipeline preview).
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
          onContinue={() => void handlePreviewContinue()}
          onBack={() => setScreen('wizard')}
          skipStripe={skipStripe}
          skipQa={skipQa}
          fastImage={fastImage}
          onChangeSkipStripe={setSkipStripe}
          onChangeSkipQa={setSkipQa}
          onChangeFastImage={setFastImage}
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
