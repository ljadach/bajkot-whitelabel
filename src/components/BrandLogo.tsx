/**
 * The Bajkoterapia wordmark, as designed for the topic landing pages.
 * Single source so the homepage, the book flow and the LP nav can't drift
 * into three different logos again.
 */
export function BrandLogo({
  withTagline = true,
  className = '',
}: {
  withTagline?: boolean;
  className?: string;
}) {
  return (
    <span className={`leading-tight ${className}`}>
      <span className="font-black text-lg text-lp-navy">
        📖 Bajko<span className="text-lp-amber-dark">terapia</span>
      </span>
      {withTagline && (
        <small className="block text-[0.62rem] font-bold text-lp-ink-soft">
          bajki, które pomagają dzieciom
        </small>
      )}
    </span>
  );
}
