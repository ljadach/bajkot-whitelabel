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
import { OrderFlowHeader } from './OrderFlowHeader';
import { scrollFlowToTop } from './scroll';
import {
  INITIAL_INTAKE,
  buildConsentsPayload,
  intakeToOrderArgs,
  type IntakeState,
  type OrderFormat,
} from './types';

type Screen = 'wizard' | 'preview' | 'checkout';

// ── Draft persistence ────────────────────────────────
// The flow lives on its own route now (/problem/:slug/zamow), so navigating
// back to the LP unmounts it. sessionStorage keeps the parent's answers for
// the tab's lifetime; cleared on successful submit. Child data stays
// session-scoped on purpose (PII — never localStorage).

const DRAFT_VERSION = 1;

interface OrderDraft {
  v: number;
  screen: Screen;
  intake: Omit<IntakeState, 'topic'>;
}

function draftKey(slug: string): string {
  return `bajkot_order_draft:${slug}`;
}

function loadDraft(slug: string): OrderDraft | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(draftKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrderDraft;
    if (parsed.v !== DRAFT_VERSION || !parsed.intake) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(slug: string, screen: Screen, intake: IntakeState) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const { topic: _topic, ...rest } = intake;
    const draft: OrderDraft = { v: DRAFT_VERSION, screen, intake: rest };
    sessionStorage.setItem(draftKey(slug), JSON.stringify(draft));
  } catch {
    // Quota/private-mode failures must never break the flow.
  }
}

function clearDraft(slug: string) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(draftKey(slug));
  } catch {
    // ignore
  }
}

/**
 * Landing order flow — standalone page at /problem/:slug/zamow.
 * Topic preselected from the URL. wizard → preview → checkout, with a fixed
 * progress header ("Krok X z 4") and scroll-to-top on every screen change.
 */
export function LandingOrderFlow({ topic }: { topic: Topic }) {
  const { t } = useTranslation('book');
  const navigate = useNavigate();
  const startLandingOrder = useAction(api.bookPipeline.startLandingOrder);

  // Restore a same-session draft so a refresh or a "let me re-read the LP"
  // round-trip doesn't wipe the form. Screen is only restored when the data
  // supports it (checkout with no child data would dead-end).
  const [screen, setScreen] = useState<Screen>(() => {
    const draft = loadDraft(topic.slug);
    if (!draft) return 'wizard';
    const { name, age, gender } = draft.intake;
    return name && age && gender ? draft.screen : 'wizard';
  });
  const [intake, setIntake] = useState<IntakeState>(() => {
    const draft = loadDraft(topic.slug);
    return draft ? { ...INITIAL_INTAKE, ...draft.intake, topic } : { ...INITIAL_INTAKE, topic };
  });
  // Wizard-internal step (2=situation, 3=child) lifted for the progress bar.
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(2);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Capture access token on mount (preserves landing-flow intake gate).
  useEffect(() => captureTokenFromUrl(), []);

  // Single source of truth for "topic committed" (spec section 7). Since the
  // flow moved to its own route this fires on the order-page mount — i.e.
  // after an actual CTA click, no longer for every LP visitor. `trigger`
  // stays for funnel continuity; `order_started` still marks the first edit.
  useEffect(() => {
    trackEvent('topic_selected', {
      flow: 'landing',
      problemId: topic.slug,
      isCustom: false,
      trigger: 'landing_preselect',
    });
  }, [topic.slug]);

  // Re-sync if user navigates between topic order pages (defensive).
  useEffect(() => {
    setIntake((prev) => ({ ...prev, topic }));
  }, [topic]);

  // Persist the draft on every change.
  useEffect(() => {
    saveDraft(topic.slug, screen, intake);
  }, [topic.slug, screen, intake]);

  // Every screen change is a "new page": snap the scrollable <main> to top.
  // (window.scrollTo is a no-op here — the app shell scrolls <main>.)
  useEffect(() => {
    scrollFlowToTop();
  }, [screen]);

  // Global flow progress: situation → child → preview → checkout.
  const flowStep = screen === 'wizard' ? (wizardStep === 3 ? 2 : 1) : screen === 'preview' ? 3 : 4;

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
        clearDraft(topic.slug);
        return { orderId, format: checkoutPayload.format };
      } catch (err) {
        setSubmitError(extractErrorMessage(err, t('flow.errorGeneric')));
        setSubmitting(false);
        return null;
      }
    },
    [intake, startLandingOrder, t, topic.slug],
  );

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
      <OrderFlowHeader backTo={`/problem/${topic.slug}`} step={flowStep} />
      {screen === 'wizard' && (
        <OrderWizard
          intake={intake}
          onChange={setIntake}
          onSubmit={() => setScreen('preview')}
          onChangeTopic={() => {
            // Send the parent to the standalone catalog to pick a different
            // topic — their own LP is one click behind in history anyway.
            void navigate('/katalog');
          }}
          showProgressNav={false}
          skipTopicStep
          onStepChange={setWizardStep}
        />
      )}
      {screen === 'preview' && (
        <OrderPreview
          intake={intake}
          onChangeFormat={handleChangeFormat}
          onContinue={() => setScreen('checkout')}
          onBack={() => {
            // Wizard always remounts at its first step — reset the lifted
            // step so the progress header doesn't disagree with the screen.
            setWizardStep(2);
            setScreen('wizard');
          }}
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
