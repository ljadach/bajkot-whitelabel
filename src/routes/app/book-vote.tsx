import { lazy, Suspense } from 'react';

const BookStyleVote = lazy(() =>
  import('../../components/book/BookStyleVote').then((m) => ({
    default: m.BookStyleVote,
  })),
);

export default function BookVotePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-6 h-6 spinner" />
        </div>
      }
    >
      <BookStyleVote />
    </Suspense>
  );
}
