import { useMemo } from 'react';
import { useLocation } from 'react-router';
import { Doc } from '../../convex/_generated/dataModel';

/**
 * Valid step names in the tutor flow.
 */
export type StepName = 'chat' | 'verification' | 'summary' | 'plan' | 'complete';

/**
 * Maps URL paths to step names.
 */
const PATH_TO_STEP: Record<string, StepName> = {
  '/chat': 'chat',
  '/verification': 'verification',
  '/summary': 'summary',
  '/assessment': 'summary', // Legacy alias
  '/plan': 'plan',
  '/course-preview': 'plan', // Legacy alias
  '/complete': 'complete',
};

/**
 * Maps step names to canonical URL paths.
 */
export const STEP_TO_PATH: Record<StepName, string> = {
  chat: '/chat',
  verification: '/verification',
  summary: '/summary',
  plan: '/plan',
  complete: '/complete',
};

/**
 * Step order for determining "next" step.
 */
const STEP_ORDER: StepName[] = ['chat', 'verification', 'summary', 'plan', 'complete'];

/**
 * Human-readable step labels.
 */
export const STEP_LABELS: Record<StepName, string> = {
  chat: 'Chat',
  verification: 'Skill Check',
  summary: 'Summary',
  plan: 'Training Plan',
  complete: 'Complete',
};

/**
 * Determines the current step from URL pathname.
 */
export function getStepFromPath(pathname: string): StepName {
  if (PATH_TO_STEP[pathname]) return PATH_TO_STEP[pathname];
  if (pathname.startsWith('/plan/')) return 'plan';
  return 'chat';
}

/**
 * Gets the next step in the flow.
 */
export function getNextStep(current: StepName): StepName | null {
  const currentIndex = STEP_ORDER.indexOf(current);
  if (currentIndex === -1 || currentIndex === STEP_ORDER.length - 1) {
    return null;
  }
  return STEP_ORDER[currentIndex + 1];
}

/**
 * Gets the previous step required before current step.
 */
export function getPreviousStep(current: StepName): StepName | null {
  const currentIndex = STEP_ORDER.indexOf(current);
  if (currentIndex <= 0) {
    return null;
  }
  return STEP_ORDER[currentIndex - 1];
}

type UserProfile = Doc<'userProfiles'>;

/**
 * Checks if a step is eligible (user can access it).
 * Eligibility is based on having the required data from previous steps.
 */
export function checkStepEligibility(step: StepName, profile: UserProfile | null): boolean {
  if (!profile) return step === 'chat';

  switch (step) {
    case 'chat':
      // Chat is always accessible
      return true;

    case 'verification':
      // Verification requires completed intake (LLM marked conversation done)
      return !!profile.intakeComplete;

    case 'summary':
      // Summary requires completed verification
      return !!profile.skillVerification;

    case 'plan':
      // Plan requires completed assessment
      return !!profile.assessmentReport;

    case 'complete':
      // Complete requires generated plan (payment disabled for now)
      return !!profile.planOutline;

    default:
      return false;
  }
}

/**
 * Checks if a step has been completed (content has been generated).
 */
export function checkStepCompletion(step: StepName, profile: UserProfile | null): boolean {
  if (!profile) return false;

  switch (step) {
    case 'chat':
      // LLM marked intake conversation as complete
      return !!profile.intakeComplete;

    case 'verification':
      // Verification is complete when skillVerification exists
      return !!profile.skillVerification;

    case 'summary':
      // Summary is complete when assessmentReport exists
      return !!profile.assessmentReport;

    case 'plan':
      // Plan is complete when planOutline exists
      return !!profile.planOutline;

    case 'complete':
      // Complete is always... complete
      return true;

    default:
      return false;
  }
}

/**
 * Gets the required step that must be completed before accessing current step.
 */
export function getRequiredStep(step: StepName, profile: UserProfile | null): StepName | null {
  if (checkStepEligibility(step, profile)) {
    return null; // Already eligible
  }

  // Find the first incomplete step in the chain
  for (const s of STEP_ORDER) {
    if (s === step) break;
    if (!checkStepCompletion(s, profile)) {
      return s;
    }
  }

  return getPreviousStep(step);
}

/**
 * Returns the most advanced step the user can access, capped at 'plan'.
 */
export function getLatestEligibleStep(profile: UserProfile | null): StepName {
  const cappedOrder: StepName[] = ['chat', 'verification', 'summary', 'plan'];
  let latest: StepName = 'chat';
  for (const step of cappedOrder) {
    if (checkStepEligibility(step, profile)) {
      latest = step;
    }
  }
  return latest;
}

export interface StepNavigationState {
  /** Current step derived from URL */
  currentStep: StepName;
  /** Whether user can access the current step */
  isEligible: boolean;
  /** Whether current step has been completed */
  isCompleted: boolean;
  /** Next step in the flow (null if at end) */
  nextStep: StepName | null;
  /** Step that needs to be completed first (null if eligible) */
  requiredStep: StepName | null;
  /** Path to the current step */
  currentPath: string;
  /** Path to the next step */
  nextPath: string | null;
  /** Path to the required step */
  requiredPath: string | null;
}

/**
 * Hook that provides step navigation state based on URL and profile.
 */
export function useStepNavigation(profile: UserProfile | null | undefined): StepNavigationState {
  const location = useLocation();

  return useMemo(() => {
    const currentStep = getStepFromPath(location.pathname);
    const safeProfile = profile ?? null;

    const isEligible = checkStepEligibility(currentStep, safeProfile);
    const isCompleted = checkStepCompletion(currentStep, safeProfile);
    const nextStep = getNextStep(currentStep);
    const requiredStep = getRequiredStep(currentStep, safeProfile);

    return {
      currentStep,
      isEligible,
      isCompleted,
      nextStep,
      requiredStep,
      currentPath: STEP_TO_PATH[currentStep],
      nextPath: nextStep ? STEP_TO_PATH[nextStep] : null,
      requiredPath: requiredStep ? STEP_TO_PATH[requiredStep] : null,
    };
  }, [location.pathname, profile]);
}
