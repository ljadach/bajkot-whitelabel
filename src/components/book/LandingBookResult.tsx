import { useParams } from 'react-router';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

export function LandingBookResult() {
  const { orderId } = useParams<{ orderId: string }>();

  const downloadUrl = useQuery(
    api.bookPipeline.getLandingDownloadUrl,
    orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );

  if (!orderId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-muted">Zamówienie nie znalezione</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 text-center">
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
        <svg
          className="w-10 h-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold text-ink mb-2">Bajka gotowa!</h1>
      <p className="text-muted mb-8">
        Twoja spersonalizowana bajka terapeutyczna jest gotowa do pobrania.
      </p>

      {downloadUrl ? (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-accent text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-accent-hover transition-colors shadow-lg"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Pobierz PDF
        </a>
      ) : (
        <div className="flex items-center justify-center gap-2 text-muted">
          <div className="w-4 h-4 spinner" />
          Przygotowuję plik...
        </div>
      )}
    </div>
  );
}
