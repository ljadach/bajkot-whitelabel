import { lazy, Suspense } from 'react';

const ProgressDashboard = lazy(() =>
  import('../../components/dashboard/ProgressDashboard').then((m) => ({
    default: m.ProgressDashboard,
  }))
);

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-6 h-6 spinner" />
        </div>
      }
    >
      <ProgressDashboard />
    </Suspense>
  );
}
