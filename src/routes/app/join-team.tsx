import { lazy, Suspense } from 'react';

const JoinOrganization = lazy(() =>
  import('../../components/team/JoinOrganization').then((m) => ({
    default: m.JoinOrganization,
  }))
);

export default function JoinTeam() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-6 h-6 spinner" />
        </div>
      }
    >
      <JoinOrganization />
    </Suspense>
  );
}
