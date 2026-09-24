import { lazy } from 'react';
import type { MetaFunction } from 'react-router';
import { ClientOnly } from '../components/ClientOnly';
import { RouteSuspense } from '../components/RouteSuspense';
import { pageTitle } from '../lib/theme';

const BookProgress = lazy(() =>
  import('../components/book/BookProgress').then((m) => ({ default: m.BookProgress })),
);

export const meta: MetaFunction = ({ location }) => [
  { title: pageTitle(location.pathname, 'Tworzymy Twoją bajkę') },
];

const spinner = (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-6 h-6 spinner" />
  </div>
);

export default function BookProgressPage() {
  // Client-only: every piece of this page is live Convex data.
  return (
    <ClientOnly fallback={spinner}>
      <RouteSuspense>
        <BookProgress />
      </RouteSuspense>
    </ClientOnly>
  );
}
