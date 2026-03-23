import { lazy, Suspense } from 'react';

const Dashboard = lazy(() =>
  import('../../components/Dashboard').then((m) => ({ default: m.DashboardPage })),
);

export default function DashboardRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-6 h-6 spinner" />
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
