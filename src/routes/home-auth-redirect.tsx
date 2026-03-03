import { Navigate } from 'react-router';
import { Authenticated, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { getLatestEligibleStep, STEP_TO_PATH } from '../hooks/useStepNavigation';

function SmartRedirect() {
  const profile = useQuery(api.profiles.getCurrentProfile);
  if (profile === undefined) return null;
  const step = getLatestEligibleStep(profile);
  return <Navigate to={STEP_TO_PATH[step]} replace />;
}

/** Client-only: redirects authenticated users to their latest step */
export default function HomeAuthRedirect() {
  return (
    <Authenticated>
      <SmartRedirect />
    </Authenticated>
  );
}
