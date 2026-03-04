import { lazy, Suspense } from 'react';

const BookOrderForm = lazy(() =>
  import('../../components/book/BookOrderForm').then((m) => ({
    default: m.BookOrderForm,
  }))
);

export default function BookOrder() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-6 h-6 spinner" />
        </div>
      }
    >
      <BookOrderForm />
    </Suspense>
  );
}
