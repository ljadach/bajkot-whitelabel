import { lazy, Suspense } from 'react';

const BookResult = lazy(() =>
  import('../../components/book/BookResult').then((m) => ({
    default: m.BookResult,
  }))
);

export default function BookResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-6 h-6 spinner" />
        </div>
      }
    >
      <BookResult />
    </Suspense>
  );
}
