import { lazy, Suspense } from 'react';

const BookPrintView = lazy(() =>
  import('../../components/book/BookPrintView').then((m) => ({
    default: m.BookPrintView,
  })),
);

export default function BookPrintPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
          }}
        >
          <div style={{ width: '24px', height: '24px' }} className="spinner" />
        </div>
      }
    >
      <BookPrintView />
    </Suspense>
  );
}
