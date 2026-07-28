import { Link } from 'react-router';
import { useWizardInView } from '../../../hooks/useWizardInView';
import { CtaButton } from './CtaButton';

/**
 * v4 sticky nav — lp-cream, book logo with tagline, single amber CTA
 * (matches public/proto1/v4.html). CTA hides once the wizard is in view.
 */
export function TopicNavV4({ topicSlug }: { topicSlug: string }) {
  const hideCta = useWizardInView();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-lp-cream/90 backdrop-blur-md border-b border-lp-cream-dark">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-2.5">
        <Link to="/" className="no-underline leading-tight">
          <span className="font-black text-lg text-lp-navy">
            📖 Bajko<span className="text-lp-amber-dark">terapia</span>
          </span>
          <small className="block text-[0.62rem] font-bold text-lp-ink-soft">
            bajki, które pomagają dzieciom
          </small>
        </Link>
        {!hideCta && <CtaButton topicSlug={topicSlug} location="nav_v4" size="sm" />}
      </div>
    </nav>
  );
}
