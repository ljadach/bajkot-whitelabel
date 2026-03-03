import type { MetaFunction } from 'react-router';
import { PricingPage } from '../pages/PricingPage';
import { buildPageMeta } from '../lib/routeMeta';

export const meta: MetaFunction = ({ location }) => buildPageMeta({ pathname: location.pathname, ns: 'pricing', routePath: '/pricing' });

export default function Pricing() {
  return <PricingPage />;
}
