import { trackEvent } from '../../../lib/telemetry';

/**
 * Unified "Stwórz bajkę" CTA — always scrolls to the inline wizard (#kreator)
 * and reports the section it was clicked in, so the funnel is measurable.
 */
export function CtaButton({
  topicSlug,
  location,
  className = '',
  children = 'Stwórz bajkę',
}: {
  topicSlug: string;
  location: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href="#kreator"
      onClick={() => trackEvent('cta_create_book_clicked', { location, topicSlug })}
      className={`inline-block bg-amberlp hover:-translate-y-0.5 text-navy font-black text-[0.95rem] px-6 py-3 rounded-full shadow-lg shadow-amberlp/40 transition text-center no-underline ${className}`}
    >
      {children}
    </a>
  );
}
