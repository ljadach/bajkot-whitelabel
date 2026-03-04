import type { MetaFunction } from 'react-router';
import { HomePage } from '../pages/HomePage';
import { buildPageMeta } from '../lib/routeMeta';

export const meta: MetaFunction = () => buildPageMeta({ ns: 'app', routePath: '/' });

export default function Home() {
  return <HomePage />;
}
