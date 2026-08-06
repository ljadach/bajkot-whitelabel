import { Link } from 'react-router';
import { trackEvent } from '../../../lib/telemetry';

const SIZE = {
  md: 'text-[0.95rem] px-6 py-3 shadow-lg',
  sm: 'text-sm px-4 py-2.5 shadow-md',
};

const CTA_CLASS =
  'inline-block bg-lp-amber hover:-translate-y-0.5 text-lp-navy font-black rounded-full shadow-lp-amber/40 transition text-center no-underline';

/**
 * Unified "Stwórz bajkę" CTA — by default navigates to the topic's standalone
 * order page (/problem/:slug/zamow) and reports the section it was clicked in,
 * so the funnel is measurable. `href` overrides the target for pages without
 * an order page of their own (homepage points at the topic grid anchor).
 */
export function CtaButton({
  topicSlug,
  location,
  className = '',
  size = 'md',
  href,
  children = 'Stwórz bajkę',
}: {
  topicSlug: string;
  location: string;
  className?: string;
  size?: keyof typeof SIZE;
  /** Override target (e.g. '#tematy' on the homepage). Default: order page. */
  href?: string;
  children?: React.ReactNode;
}) {
  const track = () => trackEvent('cta_create_book_clicked', { location, topicSlug });
  const cls = `${CTA_CLASS} ${SIZE[size]} ${className}`;

  if (href) {
    return (
      <a href={href} onClick={track} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link to={`/problem/${topicSlug}/zamow`} onClick={track} className={cls}>
      {children}
    </Link>
  );
}
