import { useParams } from 'react-router';
import { useAction, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { getAccessToken } from '../../hooks/useAccessToken';
import { BookSuccessScreen, BookPreviewScreen } from './BookResult';

export function LandingBookResult() {
  const { t } = useTranslation('book');
  const { orderId } = useParams<{ orderId: string }>();

  const data = useQuery(
    api.bookPipeline.getLandingDownloadUrl,
    orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );
  const showPreview = data?.hasPdf === true && data?.paid === false;
  const preview = useQuery(
    api.bookPipeline.getLandingOrderPreview,
    orderId && showPreview ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );
  const createLandingCheckoutSession = useAction(api.stripe.createLandingCheckoutSession);

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">{t('progress.notFound')}</p>
      </div>
    );
  }

  if (showPreview) {
    return (
      <BookPreviewScreen
        preview={preview}
        bookOrderId={orderId}
        flow="landing"
        onUnlock={async () => {
          const session = await createLandingCheckoutSession({
            bookOrderId: orderId as Id<'bookOrders'>,
            accessToken: getAccessToken() ?? '',
            returnPath: `/landing/book/${orderId}/result`,
          });
          if (typeof window !== 'undefined') window.location.assign(session.url);
        }}
      />
    );
  }

  return (
    <BookSuccessScreen
      downloadUrl={data?.url ?? null}
      childName={data?.childName ?? null}
      bookTitle={data?.bookTitle ?? null}
      upsellTo="/"
      flow="landing"
      bookOrderId={orderId}
    />
  );
}
