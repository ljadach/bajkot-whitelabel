import { lazy } from 'react';
import { RouteSuspense } from '../components/RouteSuspense';

const PrintThanks = lazy(() =>
  import('../components/book/PrintThanks').then((m) => ({ default: m.PrintThanks })),
);

export default function LandingBookPrintThanksPage() {
  return (
    <RouteSuspense>
      <PrintThanks variant="landing" />
    </RouteSuspense>
  );
}
