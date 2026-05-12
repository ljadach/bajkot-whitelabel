import { useParams } from 'react-router';
import { useAction, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { captureLandingOrderTokenFromUrl } from '../../hooks/useLandingOrderToken';
import { useResolvedR2Url } from '../../hooks/useResolvedR2Url';
import { BookSuccessScreen, BookPreviewScreen } from './BookResult';

export function LandingBookResult() {
  const { t } = useTranslation('book');
  const { orderId } = useParams<{ orderId: string }>();
  const accessToken = captureLandingOrderTokenFromUrl(orderId);

  const data = useQuery(
    api.bookPipeline.getLandingDownloadUrl,
    orderId && accessToken ? { orderId: orderId as Id<'bookOrders'>, accessToken } : 'skip',
  );
  const fullDownloadUrl = useResolvedR2Url({
    orderId: orderId as Id<'bookOrders'> | undefined,
    flow: 'landing',
    kind: 'full',
    r2Key: data?.r2FullKey ?? null,
    directUrl: data?.url ?? null,
    accessToken,
  });
  const showPreview = data?.hasPdf === true && data?.paid === false;
  const preview = useQuery(
    api.bookPipeline.getLandingOrderPreview,
    orderId && accessToken && showPreview
      ? { orderId: orderId as Id<'bookOrders'>, accessToken }
      : 'skip',
  );
  const createLandingCheckoutSession = useAction(api.stripe.createLandingCheckoutSession);

  if (!orderId || !accessToken) {
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
        accessToken={accessToken}
        onUnlock={async () => {
          const session = await createLandingCheckoutSession({
            bookOrderId: orderId as Id<'bookOrders'>,
            accessToken,
            returnPath: `/landing/book/${orderId}/result`,
          });
          if (typeof window !== 'undefined') window.location.assign(session.url);
        }}
      />
    );
  }

  return (
    <BookSuccessScreen
      downloadUrl={fullDownloadUrl}
      childName={data?.childName ?? null}
      bookTitle={data?.bookTitle ?? null}
      upsellTo="/"
      flow="landing"
      bookOrderId={orderId}
    />
  );
}
