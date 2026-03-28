import { lazy } from 'react';
import { RouteSuspense } from '../../components/RouteSuspense';

const AdminLayout = lazy(() =>
  import('../../admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);

export default function Admin() {
  return (
    <RouteSuspense>
      <AdminLayout />
    </RouteSuspense>
  );
}
