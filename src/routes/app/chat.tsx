import { lazy, Suspense } from 'react';

const TutorFlow = lazy(() => import('../../components/TutorFlow').then((m) => ({ default: m.TutorFlow })));

export default function Chat() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-6 h-6 spinner" />
        </div>
      }
    >
      <TutorFlow />
    </Suspense>
  );
}
