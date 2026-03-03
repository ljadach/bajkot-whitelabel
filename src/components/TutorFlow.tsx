import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useStepNavigation } from '../hooks/useStepNavigation';
import { ChatStep } from './steps/ChatStep';
import { VerificationStep } from './steps/VerificationStep';
import { SummaryStep } from './steps/SummaryStep';
import { PlanStep } from './steps/PlanStep';
import { CompleteStep } from './steps/CompleteStep';
import { StepBlocked } from './steps/StepBlocked';

/**
 * Main tutor flow component.
 *
 * Uses URL as the source of truth for which step to display.
 * Shows StepBlocked if user navigates to a step they're not eligible for.
 * Does NOT auto-redirect - user controls navigation.
 */
export function TutorFlow() {
  const profile = useQuery(api.profiles.getCurrentProfile);
  const createProfile = useMutation(api.profiles.createOrUpdateProfile);

  const { currentStep, isEligible, requiredStep } = useStepNavigation(profile);

  // Create profile if none exists (first visit)
  if (profile === null) {
    void createProfile({ step: 'chat' });
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-6 h-6 spinner" />
      </div>
    );
  }

  // Loading state
  if (profile === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-6 h-6 spinner" />
      </div>
    );
  }

  // Not eligible for this step - show blocked message
  if (!isEligible && requiredStep) {
    return <StepBlocked currentStep={currentStep} requiredStep={requiredStep} />;
  }

  // Render the appropriate step based on URL
  switch (currentStep) {
    case 'chat':
      return (
        <div className="h-full flex flex-col bg-white">
          <ChatStep profile={profile} />
        </div>
      );

    case 'verification':
      return (
        <div className="min-h-full">
          <VerificationStep profile={profile} />
        </div>
      );

    case 'summary':
      return (
        <div className="min-h-full">
          <SummaryStep profile={profile} />
        </div>
      );

    case 'plan':
      return (
        <div className="min-h-full">
          <PlanStep profile={profile} />
        </div>
      );

    case 'complete':
      return (
        <div className="min-h-full">
          <CompleteStep profile={profile} />
        </div>
      );

    default:
      // Fallback to chat
      return (
        <div className="h-full flex flex-col bg-white">
          <ChatStep profile={profile} />
        </div>
      );
  }
}
