import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
// Vite serves the worker bundle as an asset URL — keeps the worker out of
// the main app bundle and works across dev + prod builds.
// @ts-expect-error — `?url` is a Vite asset suffix, no TS declaration shipped.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import HTMLFlipBook from 'react-pageflip';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Embedded flipbook PDF viewer for the result-page preview. Renders the
 * preview PDF with realistic page-flip animation. Mobile falls back
 * to single-page portrait mode (the underlying StPageFlip handles that
 * automatically when `usePortrait=true`).
 */
interface BookPdfFlipbookProps {
  pdfUrl: string;
}

// Square pages — the composer emits 595x595pt PDFs (210mm). Width is
// measured from the parent container so the book never overflows its
// card; height tracks width to preserve the 1:1 aspect ratio.
const MAX_WIDTH = 640;
const MIN_WIDTH = 280;

export function BookPdfFlipbook({ pdfUrl }: BookPdfFlipbookProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(MAX_WIDTH);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const flipBookRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const node = containerRef.current;
    if (!node) return;
    // ResizeObserver keeps the flipbook in lockstep with the parent card —
    // accounts for both viewport resize and sidebar/devtools-induced reflow.
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

  // react-pdf needs a stable file reference — wrapping in useMemo keeps
  // the Document from re-fetching on every render.
  const file = useMemo(() => ({ url: pdfUrl }), [pdfUrl]);

  const width = containerWidth;
  const height = containerWidth; // 1:1 aspect — composer emits square pages.

  const goPrev = () => {
    const fb = flipBookRef.current as { pageFlip?: () => { flipPrev?: () => void } } | null;
    fb?.pageFlip?.().flipPrev?.();
  };
  const goNext = () => {
    const fb = flipBookRef.current as { pageFlip?: () => { flipNext?: () => void } } | null;
    fb?.pageFlip?.().flipNext?.();
  };

  if (error) {
    return (
      <div
        className="bg-white rounded-3xl shadow-md border border-gray-100 p-6 text-center"
        role="alert"
      >
        <p className="text-sm text-gray-600 mb-2">Nie udało się załadować podglądu.</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setNumPages(0);
          }}
          className="text-sm font-bold text-magic-600 hover:text-magic-700 underline"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4 w-full">
      <Document
        file={file}
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
        onLoadError={(e) => setError(e.message)}
        loading={
          <div className="flex items-center justify-center gap-2 py-12">
            <div className="w-5 h-5 spinner" />
            <span className="text-sm text-gray-500">Ładowanie podglądu...</span>
          </div>
        }
      >
        {numPages > 0 && (
          // @ts-expect-error — react-pageflip's IFlipSetting marks every prop
          // required, but the component reads them with defaults at runtime.
          // Passing the subset we actually care about is correct usage.
          <HTMLFlipBook
            ref={flipBookRef}
            width={width}
            height={height}
            size="fixed"
            minWidth={MIN_WIDTH}
            maxWidth={MAX_WIDTH}
            minHeight={MIN_WIDTH}
            maxHeight={MAX_WIDTH}
            drawShadow
            flippingTime={700}
            usePortrait
            showCover
            mobileScrollSupport
            useMouseEvents
            showPageCorners
            maxShadowOpacity={0.5}
            className="bajkot-flipbook"
            style={{}}
            onFlip={(e: { data: number }) => setCurrentPage(e.data)}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i} className="bg-white">
                <Page
                  pageNumber={i + 1}
                  width={width}
                  height={height}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </div>
            ))}
          </HTMLFlipBook>
        )}
      </Document>

      {numPages > 0 && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentPage === 0}
            className="w-10 h-10 rounded-full border-2 border-calm-200 bg-white text-calm-700 hover:border-calm-500 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center"
            aria-label="Poprzednia strona"
          >
            <i className="fa-solid fa-chevron-left" />
          </button>
          <span className="text-sm font-medium text-gray-600 tabular-nums">
            Strona {currentPage + 1} / {numPages}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={currentPage >= numPages - 1}
            className="w-10 h-10 rounded-full border-2 border-calm-200 bg-white text-calm-700 hover:border-calm-500 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center"
            aria-label="Następna strona"
          >
            <i className="fa-solid fa-chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
}

export default BookPdfFlipbook;
