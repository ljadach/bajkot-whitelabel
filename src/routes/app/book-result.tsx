import { lazy } from 'react';
import { RouteSuspense } from '../../components/RouteSuspense';

const BookResult = lazy(() =>
  import('../../components/book/BookResult').then((m) => ({
    default: m.BookResult,
  })),
);

export default function BookResultPage() {
  return (
    <RouteSuspense>
      <BookResult />
    </RouteSuspense>
  );
}
