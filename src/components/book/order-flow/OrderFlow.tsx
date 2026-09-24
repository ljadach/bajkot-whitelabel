import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../convex/_generated/api';
import type { Topic } from '../../../../convex/lib/topics';
import { saveOrderToken } from '../../../hooks/useOrderToken';
import { usePartner, usePartnerPaths } from '../../../hooks/usePartner';
import { extractErrorMessage } from '../../../lib/convexErrors';
import { scrollAppToTop } from '../../../lib/appScroll';
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
} from './types';

// ── Draft persistence ────────────────────────────────
// Navigating back to the topic picker unmounts the form. sessionStorage keeps
// the parent's answers for the tab's lifetime; cleared on successful submit.
// Child data stays session-scoped on purpose (PII — never localStorage). The
// current step is NOT part of the draft — it lives in the URL (?krok=), so
// refresh and browser back/forward handle it natively.

const DRAFT_VERSION = 2;

interface OrderDraft {
  v: number;
  intake: Omit<IntakeState, 'topic'>;
}

function draftKey(slug: string): string {
  return `order_draft:${slug}`;
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
// Form step 1 (situation) is the bare URL; step 2 (appearance + checkout on
// one screen) carries ?krok=2. Every forward transition is a history push,
// so the browser back button (and the header back button) walk the steps
// instead of dumping the user out of the flow.

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
 * The order form — /zamow/:slug (or /<partner>/zamow/:slug). Topic from the
 * URL, current step in ?krok=. Situation first, then appearance and checkout
 * together on one screen, under the fixed 3-step header (the topic picker is
 * step 1). Submitting starts the pipeline and moves on to the progress page.
 */
export function OrderFlow({ topic }: { topic: Topic }) {
  const { t } = useTranslation('book');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const partner = usePartner();
  const paths = usePartnerPaths();
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
        void navigate(paths.start);
      } else {
        void navigate({ search: stepSearch((from - 1) as FlowStep) }, { replace: true });
      }
    },
    [navigate, paths.start],
  );

  const handleHeaderBack = useCallback(() => goBack(flowStep), [goBack, flowStep]);

  // Re-sync if the parent navigates between topic order pages (defensive).
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

  const handleSubmit = useCallback(
    async (checkoutPayload: CheckoutSubmitPayload) => {
      if (!intake.topic || !isChildProfileComplete(intake)) {
        setSubmitError(t('flow.errorMissingData'));
        return;
      }
      setSubmitting(true);
      setSubmitError(null);
      try {
        const result = await startLandingOrder({
          partnerId: partner.id,
          ...intakeToOrderArgs(intake, {
            email: checkoutPayload.email,
            format: checkoutPayload.format,
            shippingAddress: checkoutPayload.shippingAddress,
            consents: buildConsentsPayload(partner, checkoutPayload.consents),
          }),
        });
        // Persist the per-order capability token so later screens can read
        // the order. Without it even the same browser would be locked out of
        // progress/result/vote/dedication.
        saveOrderToken(result.orderId, result.accessToken);
        clearDraft(topic.slug);
        // PDF and PDF+print run the same pipeline; payment (and the format
        // choice) happen on the result page once the book exists.
        void navigate(paths.bookProgress(result.orderId));
      } catch (err) {
        setSubmitError(extractErrorMessage(err, t('flow.errorGeneric')));
        setSubmitting(false);
      }
    },
    [intake, startLandingOrder, partner, t, topic.slug, navigate, paths],
  );

  return (
    <>
      <OrderFlowHeader onBack={handleHeaderBack} step={flowStep === 1 ? 2 : 3} />
      <OrderWizard
        intake={intake}
        onChange={setIntake}
        step={flowStep === 1 ? 'situation' : 'child'}
        onNext={() => goToStep(2)}
        onChangeTopic={() => void navigate(paths.start)}
        onRegisterValidateChild={registerValidateChild}
      />
      {/* Step 2 is appearance + checkout on one screen: e-mail and consents
          alone never justified a step of their own. */}
      {flowStep === 2 && (
        <OrderCheckout
          intake={intake}
          value={checkoutState}
          onChange={setCheckoutState}
          onSubmit={handleSubmit}
          onBack={() => goBack(2)}
          isSubmitting={submitting}
          externalError={submitError}
          beforeSubmit={validateChild}
        />
      )}
    </>
  );
}
