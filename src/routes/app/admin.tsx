import { lazy, Suspense } from 'react';

const AdminLayout = lazy(() =>
  import('../../admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);

export default function Admin() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-6 h-6 spinner" />
        </div>
      }
    >
      <AdminLayout />
    </Suspense>
  );
}
