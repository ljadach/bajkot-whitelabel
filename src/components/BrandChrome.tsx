import { Link } from 'react-router';
import { BrandLogo } from './BrandLogo';
import { usePartner, usePartnerPaths } from '../hooks/usePartner';

/**
 * Minimal header for the book pages (progress, vote, dedication, result):
 * the partner's logo linking back to the topic picker, no menu — the parent
 * is mid-flow and shouldn't be pulled away.
 */
export function BrandHeader() {
  const { start } = usePartnerPaths();
  return (
    <header className="w-full bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center">
        <Link to={start} className="shrink-0 no-underline">
          <BrandLogo />
        </Link>
      </div>
    </header>
  );
}

/** Closing strip: logo, © brand name, and the partner's support address if set. */
export function BrandFooter() {
  const partner = usePartner();
  const year = new Date().getFullYear();
  return (
    <footer className="bg-white border-t border-primary-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <BrandLogo withTagline={false} className="justify-center" />
        <div className="text-xs text-slate-500 mt-3">
          © {year} {partner.name}
          {partner.supportEmail && (
            <>
              {' · '}
              <a href={`mailto:${partner.supportEmail}`} className="hover:text-primary-700">
                {partner.supportEmail}
              </a>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
