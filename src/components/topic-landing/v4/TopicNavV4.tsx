import { Link } from 'react-router';
import { BrandLogo } from '../../BrandLogo';
import { CtaButton } from './CtaButton';

/**
 * v4 sticky nav — lp-cream, book logo with tagline, single amber CTA
 * (matches public/proto1/v4.html). CTA navigates to the order page;
 * `ctaHref` overrides the target on pages without one (homepage → #tematy).
 */
export function TopicNavV4({ topicSlug, ctaHref }: { topicSlug: string; ctaHref?: string }) {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-lp-cream/90 backdrop-blur-md border-b border-lp-cream-dark">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-2.5">
        <Link to="/" className="no-underline">
          <BrandLogo />
        </Link>
        <CtaButton topicSlug={topicSlug} location="nav_v4" size="sm" href={ctaHref} />
      </div>
    </nav>
  );
}
