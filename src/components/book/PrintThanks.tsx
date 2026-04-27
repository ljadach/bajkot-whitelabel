import { useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { trackEvent } from '@lib/telemetry';

interface Props {
  variant: 'auth' | 'landing';
}

/**
 * PDF+Print trapdoor — thank-you page after manual-fulfillment order.
 * The pipeline is paused; staff will reach out to arrange shipping.
 */
export function PrintThanks({ variant }: Props) {
  const { t } = useTranslation('book');
  const { orderId } = useParams<{ orderId: string }>();

  useEffect(() => {
    trackEvent('print_thanks_viewed', { flow: variant, bookOrderId: orderId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const queryFn =
    variant === 'auth'
      ? api.bookPipeline.getPrintThanksOrder
      : api.bookPipeline.getLandingPrintThanksOrder;

  const order = useQuery(queryFn, orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip');

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="text-7xl md:text-8xl">📚</div>

        <div>
          <span className="text-magic-500 font-bold uppercase tracking-widest text-sm mb-2 block">
            Bajkoterapia
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-calm-900 mb-3">
            {t('printThanks.heading')}
          </h1>
          <p className="text-gray-600 text-base md:text-lg max-w-md mx-auto">
            {t('printThanks.body')}
          </p>
        </div>

        {order?.email && (
          <p className="text-sm text-gray-500">
            {t('printThanks.emailNote', { email: order.email })}
          </p>
        )}

        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-magic-500 hover:bg-magic-600 text-white font-bold px-8 py-3 rounded-full transition shadow-md hover:-translate-y-0.5"
        >
          <i className="fa-solid fa-arrow-left" />
          {t('printThanks.ctaHome')}
        </Link>
      </div>
    </div>
  );
}
