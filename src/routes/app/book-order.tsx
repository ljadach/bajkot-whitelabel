import { lazy } from 'react';
import { RouteSuspense } from '../../components/RouteSuspense';

const BookOrderForm = lazy(() =>
  import('../../components/book/BookOrderForm').then((m) => ({
    default: m.BookOrderForm,
  })),
);

export default function BookOrder() {
  return (
    <RouteSuspense>
      <BookOrderForm />
    </RouteSuspense>
  );
}
