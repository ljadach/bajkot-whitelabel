import { lazy } from 'react';
import { RouteSuspense } from '../../components/RouteSuspense';

const AdminLayout = lazy(() =>
  import('../../admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const AdminAuthGate = lazy(() =>
  import('../../admin/AdminAuthGate').then((m) => ({ default: m.AdminAuthGate })),
);

export default function Admin() {
  return (
    <RouteSuspense>
      <AdminAuthGate>
        <AdminLayout />
      </AdminAuthGate>
    </RouteSuspense>
  );
}
