import { usePartner } from '../hooks/usePartner';
import { monogram } from '../lib/theme';

/**
 * The current partner's logo: their image when the theme has `logoUrl`,
 * otherwise a monogram tile plus the brand name (and tagline).
 */
export function BrandLogo({
  withTagline = true,
  className = '',
}: {
  withTagline?: boolean;
  className?: string;
}) {
  const partner = usePartner();

  if (partner.logoUrl) {
    return <img src={partner.logoUrl} alt={partner.name} className={`h-9 w-auto ${className}`} />;
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="w-9 h-9 rounded-xl bg-primary-500 text-on-primary font-black text-sm flex items-center justify-center shrink-0"
      >
        {monogram(partner.name)}
      </span>
      <span className="leading-tight text-left">
        <span className="block font-black text-lg text-primary-900">{partner.name}</span>
        {withTagline && partner.tagline && (
          <small className="block text-[0.65rem] font-bold text-slate-500">{partner.tagline}</small>
        )}
      </span>
    </span>
  );
}
