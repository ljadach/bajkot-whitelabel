import { lazy } from 'react';
import { RouteSuspense } from '../../components/RouteSuspense';

const AuthOrderFlow = lazy(() =>
  import('../../components/book/order-flow/AuthOrderFlow').then((m) => ({
    default: m.AuthOrderFlow,
  })),
);

export default function BookOrder() {
  return (
    <RouteSuspense>
      <AuthOrderFlow />
    </RouteSuspense>
  );
}
