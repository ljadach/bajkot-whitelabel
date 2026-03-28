import { Suspense, type ReactNode } from 'react';

export function RouteSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-6 h-6 spinner" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
