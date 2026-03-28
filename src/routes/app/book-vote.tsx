import { lazy } from 'react';
import { RouteSuspense } from '../../components/RouteSuspense';

const BookStyleVote = lazy(() =>
  import('../../components/book/BookStyleVote').then((m) => ({
    default: m.BookStyleVote,
  })),
);

export default function BookVotePage() {
  return (
    <RouteSuspense>
      <BookStyleVote />
    </RouteSuspense>
  );
}
