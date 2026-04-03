import { lazy } from 'react';
import { RouteSuspense } from '../components/RouteSuspense';

const LandingBookVote = lazy(() =>
  import('../components/book/LandingBookVote').then((m) => ({
    default: m.LandingBookVote,
  })),
);

export default function LandingBookVotePage() {
  return (
    <RouteSuspense>
      <LandingBookVote />
    </RouteSuspense>
  );
}
