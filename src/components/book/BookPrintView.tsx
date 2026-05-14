/**
 * Print view. Single source of truth = typst PDF in R2.
 * Renders the same PDF user downloads from result page, in an iframe
 * with print instructions. Drukowanie odbywa się przez natywny PDF
 * viewer przeglądarki — nasz "Otwórz w nowej karcie" otwiera viewer,
 * tam user klika Drukuj.
 */
import { useParams, Link } from 'react-router';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { useResolvedR2Url } from '../../hooks/useResolvedR2Url';

export function BookPrintView() {
  const { orderId } = useParams<{ orderId: string }>();

  const data = useQuery(
    api.bookPipeline.getDownloadUrl,
    orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );

  const pdfUrl = useResolvedR2Url({
    orderId: orderId as Id<'bookOrders'> | undefined,
    flow: 'auth',
    kind: 'full',
    r2Key: data?.r2FullKey ?? null,
    directUrl: data?.url ?? null,
  });

  if (!orderId) {
    return <Centered>Brak identyfikatora zamówienia.</Centered>;
  }

  if (data === undefined) {
    return (
      <Centered>
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 spinner" />
          <span className="text-sm text-calm-700">Przygotowuję książeczkę do druku…</span>
        </div>
      </Centered>
    );
  }

  if (data === null) {
    return <Centered>Nie znaleziono zamówienia lub brak dostępu.</Centered>;
  }

  const title = data.bookTitle ?? `Książeczka dla ${data.childName}`;

  if (!data.paid || !data.hasPdf) {
    return (
      <Centered>
        <div className="max-w-md text-center space-y-3">
          <p className="text-base font-bold text-calm-900">Książka jeszcze nie jest gotowa.</p>
          <p className="text-sm text-calm-700">
            Wersja do druku będzie dostępna po opłaceniu i zakończeniu generowania.
          </p>
          <Link
            to={`/book/${orderId}/result`}
            className="inline-flex items-center gap-2 rounded-2xl bg-magic-500 hover:bg-magic-600 text-white font-bold px-5 py-2.5 text-sm"
          >
            Wróć do podsumowania
          </Link>
        </div>
      </Centered>
    );
  }

  if (!pdfUrl) {
    return (
      <Centered>
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 spinner" />
          <span className="text-sm text-calm-700">Ładuję PDF…</span>
        </div>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#26a69a] to-[#00897b] text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold m-0 truncate">
              Wersja do druku: {title}
            </h1>
            <p className="text-[11px] sm:text-xs text-white/85 mt-1 m-0 leading-snug">
              Ustaw drukarkę na A4 poziomo, bez marginesów. Drukuj dwustronnie (obracanie wzdłuż
              krótkiej krawędzi).
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3 shrink-0">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-[#00897b] hover:bg-[#e0f2f1] px-3 sm:px-5 py-2 rounded-lg font-bold text-xs sm:text-sm transition"
            >
              <i className="fa-solid fa-up-right-from-square" />
              Otwórz / drukuj
            </a>
            <a
              href={pdfUrl}
              download
              className="inline-flex items-center gap-2 bg-[#00695c] hover:bg-[#004d40] text-white px-3 sm:px-5 py-2 rounded-lg font-bold text-xs sm:text-sm transition"
            >
              <i className="fa-solid fa-download" />
              Pobierz
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-white">
        <iframe
          src={pdfUrl}
          title={`Wersja do druku: ${title}`}
          className="w-full h-[calc(100vh-80px)] sm:h-[calc(100vh-72px)] border-0 block"
        />
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 text-center font-body">
      {children}
    </div>
  );
}
