import { lazy } from 'react';
import { RouteSuspense } from '../components/RouteSuspense';

const LandingBookResult = lazy(() =>
  import('../components/book/LandingBookResult').then((m) => ({
    default: m.LandingBookResult,
  })),
);

export default function LandingBookResultPage() {
  return (
    <RouteSuspense>
      <LandingBookResult />
    </RouteSuspense>
  );
}
