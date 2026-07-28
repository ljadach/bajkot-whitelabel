import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { trackEvent } from '../../../lib/telemetry';

/**
 * v4 sticky nav — cream, book logo with tagline, single amber CTA
 * (matches public/proto1/v4.html). CTA hides once the wizard is in view.
 */
export function TopicNavV4({ topicSlug }: { topicSlug: string }) {
  const [hideCta, setHideCta] = useState(false);
  useEffect(() => {
    const target = document.getElementById('kreator');
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setHideCta(entry.isIntersecting), {
      threshold: 0.05,
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-cream/90 backdrop-blur-md border-b border-cream-dark">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-2.5">
        <Link to="/" className="no-underline leading-tight">
          <span className="font-black text-lg text-navy">
            📖 Bajko<span className="text-amberlp-dark">terapia</span>
          </span>
          <small className="block text-[0.62rem] font-bold text-ink-soft">
            bajki, które pomagają dzieciom
          </small>
        </Link>
        {!hideCta && (
          <a
            href="#kreator"
            onClick={() => trackEvent('cta_create_book_clicked', { location: 'nav_v4', topicSlug })}
            className="bg-amberlp text-navy font-black text-sm px-4 py-2.5 rounded-full shadow-md shadow-amberlp/40 no-underline"
          >
            Stwórz bajkę
          </a>
        )}
      </div>
    </nav>
  );
}
