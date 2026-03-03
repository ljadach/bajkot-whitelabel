import type { MetaFunction } from 'react-router';
import { useParams } from 'react-router';
import { ProductPage } from '../pages/ProductPage';
import { buildPageMeta } from '../lib/routeMeta';

export const meta: MetaFunction = ({ location, params }) => {
  const slug = params.slug ?? '';
  return buildPageMeta({
    pathname: location.pathname,
    ns: `product-${slug}`,
    routePath: `/ai-tools/${slug}`,
  });
};

export default function Product() {
  const { slug } = useParams<{ slug: string }>();
  return <ProductPage key={slug} />;
}
