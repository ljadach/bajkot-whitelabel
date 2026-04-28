import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAction, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../convex/_generated/api';
import { setFunnelSuperProperties } from '../../../lib/telemetry';
import { OrderCatalog } from './OrderCatalog';
import { OrderWizard } from './OrderWizard';
import { OrderPreview } from './OrderPreview';
import { OrderCheckout, type CheckoutSubmitPayload } from './OrderCheckout';
import {
  INITIAL_INTAKE,
  intakeToOrderArgs,
  type IntakeState,
  type OrderFormat,
  type SelectedTopic,
} from './types';

type Screen = 'catalog' | 'wizard' | 'preview' | 'checkout';

/**
 * Authenticated order flow: catalog → wizard → preview → checkout.
 * Replaces the old `BookOrderForm`.
 */
export function AuthOrderFlow() {
  const { t } = useTranslation('book');
  const navigate = useNavigate();
  const startOrder = useAction(api.bookPipeline.startOrder);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const isAdmin = useQuery(api.auth.isAdmin) ?? false;

  const [screen, setScreen] = useState<Screen>('catalog');
  const [intake, setIntake] = useState<IntakeState>(INITIAL_INTAKE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // DEV: admin diagnostic flags. Default true so smoke tests are fast.
  // TODO(c3z): pre-launch cleanup
  const [skipStripe, setSkipStripe] = useState(true);
  const [skipQa, setSkipQa] = useState(true);

  const handleSelectTopic = useCallback((topic: SelectedTopic) => {
    setIntake((prev) => ({ ...prev, topic }));
    setScreen('wizard');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
        const result = await startOrder({
          ...baseArgs,
          // DEV: admin shortcuts. Server enforces admin gate.
          // TODO(c3z): pre-launch cleanup
          skipStripe: isAdmin && skipStripe ? true : undefined,
          skipQaReviews: isAdmin && skipQa ? true : undefined,
        });
        const orderId = result.orderId;
        // Stamp bookOrderId on every subsequent event for this device so
        // PostHog can stitch the full funnel together (spec section 7.1).
        setFunnelSuperProperties({ bookOrderId: orderId, flow: 'auth' });
        return { orderId, format: checkoutPayload?.format ?? intake.format };
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : t('flow.errorGeneric'));
        setSubmitting(false);
        return null;
      }
    },
    [intake, startOrder, isAdmin, skipStripe, skipQa, t],
  );

  // Admin shortcut: clicking the Preview CTA with `skipStripe` ON submits
  // the order directly (no checkout step, no Stripe). Skip-QA is also wired
  // through. PDF+Print still routes to the trapdoor thank-you regardless.
  const handlePreviewContinue = useCallback(async () => {
    if (isAdmin && skipStripe) {
      const result = await submitOrder(null);
      if (!result) return;
      if (result.format === 'pdf_print') {
        void navigate(`/book/${result.orderId}/print-thanks`);
        return;
      }
      void navigate(`/book/${result.orderId}/progress`);
      return;
    }
    setScreen('checkout');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isAdmin, skipStripe, submitOrder, navigate]);

  const handleCheckoutSubmit = useCallback(
    async (payload: CheckoutSubmitPayload) => {
      const result = await submitOrder(payload);
      if (!result) return;
      // PDF+Print → trapdoor thank-you
      if (payload.format === 'pdf_print') {
        void navigate(`/book/${result.orderId}/print-thanks`);
        return;
      }
      // Admin skipStripe (rare here — usually they'd skip preview→checkout
      // entirely). Kept for completeness.
      if (isAdmin && skipStripe) {
        void navigate(`/book/${result.orderId}/progress`);
        return;
      }
      // Default: Stripe checkout
      const session = await createCheckoutSession({
        bookOrderId: result.orderId,
        returnPath: `/book/${result.orderId}/progress`,
      });
      if (typeof window !== 'undefined') {
        window.location.assign(session.url);
      }
    },
    [submitOrder, createCheckoutSession, navigate, isAdmin, skipStripe],
  );

  return (
    <>
      {screen === 'catalog' && <OrderCatalog onSelect={handleSelectTopic} />}
      {screen === 'wizard' && (
        <OrderWizard
          intake={intake}
          onChange={setIntake}
          onSubmit={() => {
            setScreen('preview');
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onChangeTopic={() => {
            setScreen('catalog');
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
      {screen === 'preview' && (
        <OrderPreview
          intake={intake}
          onChangeFormat={handleChangeFormat}
          onContinue={() => void handlePreviewContinue()}
          onBack={() => setScreen('wizard')}
          isAdmin={isAdmin}
          skipStripe={skipStripe}
          skipQa={skipQa}
          onChangeSkipStripe={setSkipStripe}
          onChangeSkipQa={setSkipQa}
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
