import type { MetaFunction } from 'react-router';
import { CatalogPage } from '../pages/CatalogPage';
import { buildPageMeta } from '../lib/routeMeta';

export const meta: MetaFunction = () => buildPageMeta({ ns: 'app', routePath: '/katalog' });

export default function Catalog() {
  return <CatalogPage />;
}
