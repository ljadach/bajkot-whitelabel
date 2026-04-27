import { useParams } from 'react-router';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { BookSuccessScreen } from './BookResult';

export function LandingBookResult() {
  const { t } = useTranslation('book');
  const { orderId } = useParams<{ orderId: string }>();

  const data = useQuery(
    api.bookPipeline.getLandingDownloadUrl,
    orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">{t('progress.notFound')}</p>
      </div>
    );
  }

  return (
    <BookSuccessScreen
      downloadUrl={data?.url ?? null}
      childName={data?.childName ?? null}
      bookTitle={data?.bookTitle ?? null}
      upsellTo="/"
    />
  );
}
