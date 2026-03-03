import type { MetaFunction } from 'react-router';
import { ToolsHubPage } from '../pages/ToolsHubPage';
import { buildPageMeta } from '../lib/routeMeta';

export const meta: MetaFunction = ({ location }) => buildPageMeta({ pathname: location.pathname, ns: 'tools-hub', routePath: '/ai-tools' });

export default function ToolsHub() {
  return <ToolsHubPage />;
}
