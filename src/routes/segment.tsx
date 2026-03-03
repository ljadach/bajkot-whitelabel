import type { MetaFunction } from 'react-router';
import { useLocation } from 'react-router';
import { segmentBySlug, SEGMENT_CONFIG } from '../pages/segmentConfig';
import { SegmentPage } from '../pages/SegmentPage';
import { buildPageMeta } from '../lib/routeMeta';

function slugFromPathname(pathname: string): string {
  return pathname.replace(/^\/(en|pl|de)\//, '').replace(/\/$/, '');
}

export const meta: MetaFunction = ({ location }) => {
  const slug = slugFromPathname(location.pathname);
  const segment = segmentBySlug(slug);
  if (!segment) return [];
  const cfg = SEGMENT_CONFIG[segment];
  return buildPageMeta({
    pathname: location.pathname,
    ns: cfg.namespace,
    routePath: `/${slug}`,
  });
};

export default function Segment() {
  const { pathname } = useLocation();
  const slug = slugFromPathname(pathname);
  const segment = segmentBySlug(slug);

  if (!segment) return null;

  return <SegmentPage segment={segment} />;
}
