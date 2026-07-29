import { Suspense, lazy } from 'react';
import { Link } from 'react-router';
import { ClientOnly } from './ClientOnly';
import { BrandLogo } from './BrandLogo';

const LazyHeaderActions = lazy(() =>
  import('./ClientAppShell').then((m) => ({ default: m.HeaderActions })),
);

const headerFallback = <div className="flex items-center gap-1" />;

export function Header() {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-neutral-200">
      <div className="h-14 max-w-content mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link to="/" className="no-underline hover:opacity-80 transition-opacity">
          <BrandLogo />
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
