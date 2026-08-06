import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../convex/_generated/api';
// Stripe checkout has moved to the result screen (post-pipeline preview).
// AuthOrderFlow no longer redirects to Stripe — pipeline starts immediately
// and the result page shows the unlock-PDF CTA after a real preview.
import { setFunnelSuperProperties } from '../../../lib/telemetry';
import { extractErrorMessage } from '../../../lib/convexErrors';
import { OrderCatalog } from './OrderCatalog';
import { OrderWizard } from './OrderWizard';
import { OrderPreview } from './OrderPreview';
import { OrderCheckout, type CheckoutSubmitPayload } from './OrderCheckout';
import { scrollFlowToTop } from './scroll';
import {
  INITIAL_INTAKE,
  buildConsentsPayload,
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

  // Every screen change is a "new page": snap the scrollable <main> to top.
  // (The previous window.scrollTo calls were silent no-ops — the app shell
  // scrolls <main>, not window.)
  useEffect(() => {
    scrollFlowToTop();
  }, [screen]);

  const handleSelectTopic = useCallback((topic: SelectedTopic) => {
    setIntake((prev) => ({ ...prev, topic }));
    setScreen('wizard');
  }, []);

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
        const result = await startOrder(baseArgs);
        const orderId = result.orderId;
        // Stamp bookOrderId on every subsequent event for this device so
        // PostHog can stitch the full funnel together (spec section 7.1).
        setFunnelSuperProperties({ bookOrderId: orderId, flow: 'auth' });
        return { orderId, format: checkoutPayload.format };
      } catch (err) {
        setSubmitError(extractErrorMessage(err, t('flow.errorGeneric')));
        setSubmitting(false);
        return null;
      }
    },
    [intake, startOrder, t],
  );

  const handlePreviewContinue = useCallback(() => {
    setScreen('checkout');
  }, []);

  const handleCheckoutSubmit = useCallback(
    async (payload: CheckoutSubmitPayload) => {
      const result = await submitOrder(payload);
      if (!result) return;
      // Both PDF and PDF+Print run the pipeline. Stripe payment (49 vs 99 PLN)
      // is gated at the result page after a real preview. Physical shipping
      // for pdf_print is triggered by admin alert email post-payment.
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
          onSubmit={() => setScreen('preview')}
          onChangeTopic={() => setScreen('catalog')}
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
