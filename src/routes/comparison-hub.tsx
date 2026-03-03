import type { MetaFunction } from 'react-router';
import { ComparisonHubPage } from '../pages/ComparisonHubPage';
import { buildPageMeta } from '../lib/routeMeta';

export const meta: MetaFunction = ({ location }) => buildPageMeta({ pathname: location.pathname, ns: 'compare-hub', routePath: '/ai-tools/compare' });

export default function ComparisonHub() {
  return <ComparisonHubPage />;
}
