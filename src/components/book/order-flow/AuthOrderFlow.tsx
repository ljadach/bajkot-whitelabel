import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../convex/_generated/api';
// Stripe checkout has moved to the result screen (post-pipeline preview).
// AuthOrderFlow no longer redirects to Stripe — pipeline starts immediately
// and the result page shows the unlock-PDF CTA after a real preview.
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

  const [screen, setScreen] = useState<Screen>('catalog');
  const [intake, setIntake] = useState<IntakeState>(INITIAL_INTAKE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
        const result = await startOrder(baseArgs);
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
    [intake, startOrder, t],
  );

  const handlePreviewContinue = useCallback(() => {
    setScreen('checkout');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCheckoutSubmit = useCallback(
    async (payload: CheckoutSubmitPayload) => {
      const result = await submitOrder(payload);
      if (!result) return;
      // PDF+Print → trapdoor thank-you (manual fulfilment via mail)
      if (payload.format === 'pdf_print') {
        void navigate(`/book/${result.orderId}/print-thanks`);
        return;
      }
      // Pipeline starts immediately. Stripe payment is now gated at the
      // result page — parents see a real preview of their book before paying.
      void navigate(`/book/${result.orderId}/progress`);
    },
    [submitOrder, navigate],
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
