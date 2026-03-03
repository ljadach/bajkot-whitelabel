import { lazy, Suspense } from 'react';

const SettingsPage = lazy(() => import('../../components/SettingsPage').then((m) => ({ default: m.SettingsPage })));

export default function Settings() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-6 h-6 spinner" />
        </div>
      }
    >
      <SettingsPage />
    </Suspense>
  );
}
