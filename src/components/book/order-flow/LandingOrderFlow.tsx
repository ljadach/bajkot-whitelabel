import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAction } from 'convex/react';
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
  const createLandingCheckoutSession = useAction(api.stripe.createLandingCheckoutSession);

  const [screen, setScreen] = useState<Screen>('wizard');
  const [intake, setIntake] = useState<IntakeState>(() => ({
    ...INITIAL_INTAKE,
    topic,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
        // Stamp bookOrderId on every subsequent event for this device so
        // PostHog can stitch the full funnel together (spec section 7.1).
        setFunnelSuperProperties({ bookOrderId: orderId, flow: 'landing' });

        // PDF+Print → landing trapdoor thank-you (no Stripe; manual fulfillment)
        if (payload.format === 'pdf_print') {
          void navigate(`/landing/book/${orderId}/print-thanks`);
          return;
        }

        // PDF: kick off Stripe Checkout. The landing-specific action
        // validates the access token instead of requiring Clerk identity,
        // and uses bookOrderId metadata so the existing webhook still
        // marks the order paid (identity-agnostic).
        const session = await createLandingCheckoutSession({
          bookOrderId: orderId,
          accessToken: getAccessToken() ?? '',
          returnPath: `/landing/book/${orderId}/progress`,
        });
        if (typeof window !== 'undefined') {
          window.location.assign(session.url);
        }
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : t('flow.errorGeneric'));
        setSubmitting(false);
      }
    },
    [intake, startLandingOrder, createLandingCheckoutSession, navigate, t],
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
