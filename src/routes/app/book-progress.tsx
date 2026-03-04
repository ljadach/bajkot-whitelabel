import { lazy, Suspense } from 'react';

const BookProgress = lazy(() =>
  import('../../components/book/BookProgress').then((m) => ({
    default: m.BookProgress,
  })),
);

export default function BookProgressPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-6 h-6 spinner" />
        </div>
      }
    >
      <BookProgress />
    </Suspense>
  );
}
