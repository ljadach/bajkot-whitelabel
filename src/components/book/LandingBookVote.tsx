import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';

/**
 * Backwards-compat: the standalone /landing/book/:id/vote route is no longer
 * the canonical place for the style vote. The vote now appears inline inside
 * `LandingBookProgress` when the pipeline produces both style images. If a
 * user lands on this route directly, we bounce them to the progress page
 * where the inline vote will surface if it's still pending.
 */
export function LandingBookVote() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();

  useEffect(() => {
    if (orderId) {
      void navigate(`/landing/book/${orderId}/progress`, { replace: true });
    }
  }, [orderId, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 spinner" />
    </div>
  );
}
