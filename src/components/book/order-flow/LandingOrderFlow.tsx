import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../convex/_generated/api';
import { captureTokenFromUrl, getAccessToken } from '../../../hooks/useAccessToken';
import { saveLandingOrderToken } from '../../../hooks/useLandingOrderToken';
import type { Topic } from '../../../data/topics';
import { setFunnelSuperProperties, trackEvent } from '../../../lib/telemetry';
import { getAttribution } from '../../../lib/attribution';
import { buildMetaOrderAttribution } from '../../../lib/metaPixel';
import { extractErrorMessage } from '../../../lib/convexErrors';
import { scrollAppToTop } from '../../../lib/appScroll';
import { topicPath } from '../../../lib/paths';
import { OrderWizard } from './OrderWizard';
import { OrderCheckout, type CheckoutSubmitPayload } from './OrderCheckout';
import { OrderFlowHeader } from './OrderFlowHeader';
import {
  INITIAL_CHECKOUT_STATE,
  INITIAL_INTAKE,
  buildConsentsPayload,
  intakeToOrderArgs,
  isChildProfileComplete,
  type CheckoutFormState,
  type IntakeState,
  type OrderFormat,
} from './types';

// ── Draft persistence ────────────────────────────────
// The flow lives on its own route (/problem/:slug/zamow), so navigating back
// to the LP unmounts it. sessionStorage keeps the parent's answers for the
// tab's lifetime; cleared on successful submit. Child data stays
// session-scoped on purpose (PII — never localStorage). The current step is
// NOT part of the draft — it lives in the URL (?krok=), so refresh and
// browser back/forward handle it natively.

const DRAFT_VERSION = 2;

interface OrderDraft {
  v: number;
  intake: Omit<IntakeState, 'topic'>;
}

function draftKey(slug: string): string {
  return `bajkot_order_draft:${slug}`;
}

/** Drafts are best-effort: SSR, private mode and quota failures all no-op. */
function withSessionStorage<T>(fn: (storage: Storage) => T): T | null {
  try {
    return fn(sessionStorage);
  } catch {
    return null;
  }
}

function loadDraftIntake(slug: string): IntakeState | null {
  return withSessionStorage((storage) => {
    const raw = storage.getItem(draftKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrderDraft;
    if (parsed.v !== DRAFT_VERSION || !parsed.intake) return null;
    return { ...INITIAL_INTAKE, ...parsed.intake };
  });
}

function saveDraft(slug: string, intake: IntakeState) {
  withSessionStorage((storage) => {
    const { topic: _topic, ...rest } = intake;
    storage.setItem(draftKey(slug), JSON.stringify({ v: DRAFT_VERSION, intake: rest }));
  });
}

function clearDraft(slug: string) {
  withSessionStorage((storage) => storage.removeItem(draftKey(slug)));
}

// ── Step ↔ URL mapping ───────────────────────────────
// Flow steps 1-2 (situation, then child data + checkout on one screen).
// Step 1 is the bare URL; step 2 carries ?krok=2. Every forward transition
// is a history push, so the browser back button (and the header back button)
// walk the steps instead of dumping the user out of the flow.

type FlowStep = 1 | 2;

function stepSearch(step: FlowStep): string {
  return step === 1 ? '' : `?krok=${step}`;
}

/** True when this tab's history has an entry before the current one —
 * React Router data routers stamp their index on history.state. */
function canGoBack(): boolean {
  if (typeof window === 'undefined') return false;
  const state = window.history.state as { idx?: number } | null;
  return (state?.idx ?? 0) > 0;
}

/**
 * Landing order flow — standalone page at /problem/:slug/zamow.
 * Topic preselected from the URL, current step in ?krok=. Situation, then
 * child data and checkout together on one screen, with a fixed progress
 * header, native browser back/forward between steps, and scroll-to-top on
 * every step change.
 */
export function LandingOrderFlow({ topic }: { topic: Topic }) {
  const { t } = useTranslation('book');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startLandingOrder = useAction(api.bookPipeline.startLandingOrder);

  const [intake, setIntake] = useState<IntakeState>(() => {
    const draft = loadDraftIntake(topic.slug);
    return draft ? { ...draft, topic } : { ...INITIAL_INTAKE, topic };
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Lifted out of OrderCheckout so it survives that component unmounting when
  // the parent steps back to step 1 (only its own field-validation errors
  // reset, not the values themselves).
  const [checkoutState, setCheckoutState] = useState<CheckoutFormState>(INITIAL_CHECKOUT_STATE);

  // Current step comes from the URL. Name, age and gender live on step 1, so
  // step 2 requires them — a deep link or a stale draft can't dead-end there.
  const rawStep = Number(searchParams.get('krok') ?? '1');
  const urlStep: FlowStep = rawStep === 2 ? 2 : 1;
  const flowStep: FlowStep = urlStep === 2 && !isChildProfileComplete(intake) ? 1 : urlStep;

  // If the guard demoted the step, make the URL agree (replace, not push —
  // the unreachable step must not stay in history).
  useEffect(() => {
    if (flowStep !== urlStep) {
      void navigate({ search: stepSearch(flowStep) }, { replace: true });
    }
  }, [flowStep, urlStep, navigate]);

  const goToStep = useCallback(
    (target: FlowStep) => {
      void navigate({ search: stepSearch(target) });
    },
    [navigate],
  );

  // Back = browser back whenever this tab has history to walk (keeps
  // back/forward symmetric with on-page buttons). Deep entries fall back to
  // an explicit replace so we never dump the user out of an unfamiliar tab.
  const goBack = useCallback(
    (from: FlowStep) => {
      if (canGoBack()) {
        void navigate(-1);
      } else if (from === 1) {
        void navigate(topicPath(topic.slug));
      } else {
        void navigate({ search: stepSearch((from - 1) as FlowStep) }, { replace: true });
      }
    },
    [navigate, topic.slug],
  );

  const handleHeaderBack = useCallback(() => goBack(flowStep), [goBack, flowStep]);

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
    setIntake((prev) => (prev.topic === topic ? prev : { ...prev, topic }));
  }, [topic]);

  // Persist the draft on every change.
  useEffect(() => {
    saveDraft(topic.slug, intake);
  }, [topic.slug, intake]);

  // Every step change is a "new page": snap the scrollable <main> to top.
  // (Root ScrollToTop only watches pathname; ?krok= changes land here.)
  useEffect(() => {
    scrollAppToTop();
  }, [flowStep]);

  // The child fields live in the wizard but the only submit button lives in
  // the checkout below it, so the wizard hands its validator up here.
  const validateChildRef = useRef<(() => boolean) | null>(null);
  const registerValidateChild = useCallback((validate: () => boolean) => {
    validateChildRef.current = validate;
  }, []);
  const validateChild = useCallback(() => validateChildRef.current?.() ?? true, []);

  // Wizard-internal step for flow steps 1-2 (2=situation, 3=child).
  const wizardStep: 2 | 3 = flowStep === 2 ? 3 : 2;
  const handleWizardStep = useCallback(
    (step: 1 | 2 | 3) => {
      // The wizard reports its internal target; 1 (topic confirm) is skipped
      // in this flow. Child (3) is forward, situation (2) is backward.
      if (step === 3) goToStep(2);
      else if (step === 2) goBack(2);
    },
    [goToStep, goBack],
  );

  const submitOrder = useCallback(
    async (
      checkoutPayload: CheckoutSubmitPayload,
    ): Promise<{ orderId: string; format: OrderFormat } | null> => {
      if (!intake.topic || !isChildProfileComplete(intake)) {
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
        // Meta match keys are snapshotted HERE, at submit, and not at
        // payment: by the time Stripe's webhook fires the browser that owns
        // the `_fbp` / `_fbc` cookies is gone. Falls back to the `fbclid`
        // in our own attribution snapshot when Meta's cookie is missing.
        const attribution = getAttribution();
        const result = await startLandingOrder({
          accessToken: getAccessToken() ?? '',
          ...baseArgs,
          metaAttribution: buildMetaOrderAttribution(attribution?.fbclid, attribution?.capturedAt),
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
      <OrderFlowHeader onBack={handleHeaderBack} step={flowStep} />
      <OrderWizard
        intake={intake}
        onChange={setIntake}
        onSubmit={() => goToStep(2)}
        onChangeTopic={() => {
          // Send the parent to the standalone catalog to pick a different
          // topic — their own LP is one click behind in history anyway.
          void navigate('/katalog');
        }}
        showProgressNav={false}
        skipTopicStep
        step={wizardStep}
        onStepChange={handleWizardStep}
        hideChildSubmit={flowStep === 2}
        onRegisterValidateChild={registerValidateChild}
      />
      {/* Step 2 is child data + checkout on one screen: e-mail and consents
          alone never justified a step of their own, and the click cost real
          completions. */}
      {flowStep === 2 && (
        <OrderCheckout
          intake={intake}
          value={checkoutState}
          onChange={setCheckoutState}
          onSubmit={handleCheckoutSubmit}
          onBack={() => goBack(2)}
          isSubmitting={submitting}
          externalError={submitError}
          embedded
          beforeSubmit={validateChild}
        />
      )}
    </>
  );
}
