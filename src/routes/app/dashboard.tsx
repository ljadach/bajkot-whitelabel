import { lazy } from 'react';
import { RouteSuspense } from '../../components/RouteSuspense';

const Dashboard = lazy(() =>
  import('../../components/Dashboard').then((m) => ({ default: m.DashboardPage })),
);

export default function DashboardRoute() {
  return (
    <RouteSuspense>
      <Dashboard />
    </RouteSuspense>
  );
}
