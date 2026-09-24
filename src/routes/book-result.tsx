import { lazy } from 'react';
import type { MetaFunction } from 'react-router';
import { ClientOnly } from '../components/ClientOnly';
import { RouteSuspense } from '../components/RouteSuspense';
import { pageTitle } from '../lib/theme';

const BookResult = lazy(() =>
  import('../components/book/BookResult').then((m) => ({ default: m.BookResult })),
);

export const meta: MetaFunction = ({ location }) => [
  { title: pageTitle(location.pathname, 'Twoja bajka') },
];

const spinner = (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-6 h-6 spinner" />
  </div>
);

export default function BookResultPage() {
  // Client-only: every piece of this page is live Convex data.
  return (
    <ClientOnly fallback={spinner}>
      <RouteSuspense>
        <BookResult />
      </RouteSuspense>
    </ClientOnly>
  );
}
