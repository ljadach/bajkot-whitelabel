import type { MetaFunction } from 'react-router';
import { GlossaryPage } from '../pages/GlossaryPage';
import { buildPageMeta } from '../lib/routeMeta';

export const meta: MetaFunction = ({ location }) => buildPageMeta({ pathname: location.pathname, ns: 'glossary', routePath: '/ai-tools/glossary' });

export default function Glossary() {
  return <GlossaryPage />;
}
