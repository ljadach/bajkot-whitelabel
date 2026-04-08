import { lazy } from 'react';
import { RouteSuspense } from '../components/RouteSuspense';

const LandingBookProgress = lazy(() =>
  import('../components/book/LandingBookProgress').then((m) => ({
    default: m.LandingBookProgress,
  })),
);

export default function LandingBookProgressPage() {
  return (
    <RouteSuspense>
      <LandingBookProgress />
    </RouteSuspense>
  );
}
