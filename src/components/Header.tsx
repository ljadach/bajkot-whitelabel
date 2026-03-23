import { Suspense, lazy } from 'react';
import { Link } from 'react-router';
import { ClientOnly } from './ClientOnly';

const LazyHeaderActions = lazy(() =>
  import('./ClientAppShell').then((m) => ({ default: m.HeaderActions })),
);

const headerFallback = <div className="flex items-center gap-1" />;

export function Header() {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-neutral-200">
      <div className="h-14 max-w-content mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-neutral-900 tracking-tight">BiD</span>
          </div>
        </Link>
        <ClientOnly fallback={headerFallback}>
          <Suspense fallback={headerFallback}>
            <LazyHeaderActions />
          </Suspense>
        </ClientOnly>
      </div>
    </header>
  );
}
