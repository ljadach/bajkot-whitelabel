import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
// Vite serves the worker bundle as an asset URL — keeps the worker out of
// the main app bundle and works across dev + prod builds.
// @ts-expect-error — `?url` is a Vite asset suffix, no TS declaration shipped.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Single-page PDF viewer for the result-page preview. The composer emits
 * 1:1 square pages (210×210mm). Container locks aspect-ratio so the card
 * never grows taller than its own width — arrows overlay the PDF, so they
 * stay visible regardless of viewport height.
 */
interface BookPdfFlipbookProps {
  pdfUrl: string;
}

const MAX_WIDTH = 560;
const MIN_WIDTH = 240;

export function BookPdfFlipbook({ pdfUrl }: BookPdfFlipbookProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(MAX_WIDTH);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const node = containerRef.current;
    if (!node) return;
    const measure = (w: number) => {
      const usable = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.floor(w)));
      setContainerWidth(usable);
    };
    measure(node.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) measure(entry.contentRect.width);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const file = useMemo(() => ({ url: pdfUrl }), [pdfUrl]);

  const canPrev = currentPage > 0;
  const canNext = currentPage < numPages - 1;
  const goPrev = () => {
    if (canPrev) setCurrentPage((p) => p - 1);
  };
  const goNext = () => {
    if (canNext) setCurrentPage((p) => p + 1);
  };

  if (error) {
    return (
      <div
        className="aspect-[5/7] w-full max-w-[560px] mx-auto bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center gap-3 p-6 text-center"
        role="alert"
      >
        <p className="text-sm text-gray-600">Nie udało się załadować podglądu.</p>
        <button
          type="button"
          onClick={() => {
            // Bump attempt remontuje <Document>, więc pdf.js pobiera plik od
            // nowa. Bez tego „spróbuj ponownie" tylko chowało komunikat —
            // `file` miało tę samą tożsamość i nic się nie ładowało.
            setError(null);
            setNumPages(0);
            setAttempt((a) => a + 1);
          }}
          className="text-sm font-bold text-magic-600 hover:text-magic-700 underline"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-[560px] mx-auto">
      <div className="relative aspect-[5/7] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-calm-50 via-white to-magic-50 shadow-inner">
        <Document
          key={attempt}
          file={file}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          onLoadError={(e) => setError(e.message)}
          loading={
            <div className="absolute inset-0 flex items-center justify-center gap-2">
              <div className="w-5 h-5 spinner" />
              <span className="text-sm text-gray-500">Ładowanie podglądu...</span>
            </div>
          }
          className="absolute inset-0 flex items-center justify-center"
        >
          {numPages > 0 && (
            <Page
              key={currentPage}
              pageNumber={currentPage + 1}
              width={containerWidth}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              className="bajkot-pdf-page"
            />
          )}
        </Document>

        {numPages > 0 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-calm-900/85 backdrop-blur-sm text-white text-xs font-semibold tabular-nums px-3 py-1.5 rounded-full shadow-md z-10">
            {currentPage + 1} / {numPages}
          </div>
        )}
      </div>

      {numPages > 0 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            disabled={!canPrev}
            className="absolute left-1 sm:-left-14 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm text-magic-600 shadow-lg ring-1 ring-black/10 hover:bg-white hover:scale-110 disabled:opacity-0 disabled:pointer-events-none transition flex items-center justify-center z-10"
            aria-label="Poprzednia strona"
          >
            <i className="fa-solid fa-chevron-left text-base" />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            className="absolute right-1 sm:-right-14 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm text-magic-600 shadow-lg ring-1 ring-black/10 hover:bg-white hover:scale-110 disabled:opacity-0 disabled:pointer-events-none transition flex items-center justify-center z-10"
            aria-label="Następna strona"
          >
            <i className="fa-solid fa-chevron-right text-base" />
          </button>
        </>
      )}
    </div>
  );
}

export default BookPdfFlipbook;
