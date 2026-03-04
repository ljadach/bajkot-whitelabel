import { useParams, Link } from 'react-router';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

export function BookResult() {
  const { t } = useTranslation('book');
  const { orderId } = useParams<{ orderId: string }>();

  const downloadUrl = useQuery(
    api.bookPipeline.getDownloadUrl,
    orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip'
  );

  if (!orderId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-muted">Order not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center">
      <div className="rounded-xl border-2 border-success bg-emerald-50 p-8">
        {/* Success icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-ink mb-2">{t('result.heading')}</h1>
        <p className="text-sm text-muted mb-6">{t('result.description')}</p>

        {downloadUrl ? (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-success px-8 py-3.5 text-lg font-semibold text-white hover:opacity-90 transition-colors"
          >
            {t('result.download')}
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 spinner" />
            <span className="text-sm text-muted">{t('result.processing')}</span>
          </div>
        )}

        <Link
          to="/book/order"
          className="mt-6 block text-sm font-medium text-accent hover:text-accent-hover transition-colors"
        >
          {t('result.createAnother')}
        </Link>
      </div>
    </div>
  );
}
