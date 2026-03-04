import type { MetaFunction } from 'react-router';
import { FaqPage } from '../pages/FaqPage';
import { buildPageMeta } from '../lib/routeMeta';

export const meta: MetaFunction = () => buildPageMeta({ ns: 'faq', routePath: '/support/faq' });

export default function Faq() {
  return <FaqPage />;
}
