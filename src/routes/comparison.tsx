import type { MetaFunction } from 'react-router';
import { useParams } from 'react-router';
import { ComparisonPage } from '../pages/ComparisonPage';
import { buildPageMeta } from '../lib/routeMeta';

export const meta: MetaFunction = ({ location, params }) => {
  const slug = params.slug ?? '';
  return buildPageMeta({
    pathname: location.pathname,
    ns: `compare-${slug}`,
    routePath: `/ai-tools/compare/${slug}`,
  });
};

export default function Comparison() {
  const { slug } = useParams<{ slug: string }>();
  return <ComparisonPage key={slug} />;
}
