import { lazy } from 'react';
import { RouteSuspense } from '../../components/RouteSuspense';

const BookProgress = lazy(() =>
  import('../../components/book/BookProgress').then((m) => ({
    default: m.BookProgress,
  })),
);

export default function BookProgressPage() {
  return (
    <RouteSuspense>
      <BookProgress />
    </RouteSuspense>
  );
}
