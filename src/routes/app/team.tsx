import { lazy, Suspense } from 'react';

const TeamDashboard = lazy(() =>
  import('../../components/team/TeamDashboard').then((m) => ({
    default: m.TeamDashboard,
  }))
);

export default function Team() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-6 h-6 spinner" />
        </div>
      }
    >
      <TeamDashboard />
    </Suspense>
  );
}
