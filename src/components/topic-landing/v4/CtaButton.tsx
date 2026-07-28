import { trackEvent } from '../../../lib/telemetry';

const SIZE = {
  md: 'text-[0.95rem] px-6 py-3 shadow-lg',
  sm: 'text-sm px-4 py-2.5 shadow-md',
};

/**
 * Unified "Stwórz bajkę" CTA — always scrolls to the inline wizard (#kreator)
 * and reports the section it was clicked in, so the funnel is measurable.
 */
export function CtaButton({
  topicSlug,
  location,
  className = '',
  size = 'md',
  children = 'Stwórz bajkę',
}: {
  topicSlug: string;
  location: string;
  className?: string;
  size?: keyof typeof SIZE;
  children?: React.ReactNode;
}) {
  return (
    <a
      href="#kreator"
      onClick={() => trackEvent('cta_create_book_clicked', { location, topicSlug })}
      className={`inline-block bg-lp-amber hover:-translate-y-0.5 text-lp-navy font-black rounded-full shadow-lp-amber/40 transition text-center no-underline ${SIZE[size]} ${className}`}
    >
      {children}
    </a>
  );
}
