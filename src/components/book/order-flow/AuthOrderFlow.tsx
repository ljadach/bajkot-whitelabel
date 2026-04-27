import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAction, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../convex/_generated/api';
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

  const handleSelectTopic = useCallback((topic: SelectedTopic) => {
    setIntake((prev) => ({ ...prev, topic }));
    setScreen('wizard');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
        const result = await startOrder({
          ...baseArgs,
          // DEV: admin shortcuts. Server enforces admin gate.
          // TODO(c3z): pre-launch cleanup
          skipStripe: payload.skipStripe || undefined,
          skipQaReviews: payload.skipQa || undefined,
        });

        const orderId = result.orderId;

        // PDF+Print → trapdoor thank-you
        if (payload.format === 'pdf_print') {
          void navigate(`/book/${orderId}/print-thanks`);
          return;
        }

        // Admin skipStripe → straight to progress (pipeline already started)
        if (payload.skipStripe && isAdmin) {
          void navigate(`/book/${orderId}/progress`);
          return;
        }

        // Default: Stripe checkout
        const session = await createCheckoutSession({
          bookOrderId: orderId,
          returnPath: `/book/${orderId}/progress`,
        });
        if (typeof window !== 'undefined') {
          window.location.assign(session.url);
        }
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : t('flow.errorGeneric'));
        setSubmitting(false);
      }
    },
    [intake, startOrder, createCheckoutSession, navigate, isAdmin, t],
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
          onChangeTopic={() => setScreen('catalog')}
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
