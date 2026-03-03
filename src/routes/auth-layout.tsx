import { lazy, Suspense } from 'react';
import { isRouteErrorResponse, useRouteError, Link } from 'react-router';

const AuthLayoutInner = lazy(() => import('./auth-layout-inner'));

/** Auth-gated layout — lazy-loads auth checks to avoid SSR issues */
export default function AuthLayout() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-6 h-6 spinner" />
        </div>
      }
    >
      <AuthLayoutInner />
    </Suspense>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  let message = 'Something went wrong. Please try again.';
  if (isRouteErrorResponse(error) && error.status === 404) {
    message = 'This page does not exist.';
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-neutral-900 mb-2">Oops</h1>
        <p className="text-neutral-500 mb-4">{message}</p>
        <Link to="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
