import { Suspense, lazy, useState } from 'react';
import { trackEvent } from '../../../lib/telemetry';
import type { Topic } from '../../../data/topics';
import { PRINT_GALLERY, SAMPLE_BOOK, SECTION_COPY } from '../../../data/lpContent';
import { GalleryWithLightbox } from './Lightbox';
import { ModalOverlay } from './ModalOverlay';
import { Section, SectionHeading } from './Section';

// react-pdf pulls a heavy chunk — load only when the sample-book modal opens.
const BookPdfFlipbook = lazy(() =>
  import('../../book/BookPdfFlipbook').then((m) => ({ default: m.BookPdfFlipbook })),
);

function SampleBookModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalOverlay
      onClose={onClose}
      label={`Przykładowa bajka: ${SAMPLE_BOOK.title}`}
      className="flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl p-4 md:p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-black text-lp-navy">„{SAMPLE_BOOK.title}”</h3>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={SAMPLE_BOOK.pdf}
              download
              className="bg-lp-teal text-white text-sm font-bold px-4 py-2 rounded-full no-underline"
            >
              ⬇ Pobierz PDF
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Zamknij"
              className="w-9 h-9 rounded-full bg-lp-cream-dark text-lp-navy font-bold"
            >
              ✕
            </button>
          </div>
        </div>
        <Suspense
          fallback={<div className="py-24 text-center text-lp-ink-soft">Ładuję bajkę…</div>}
        >
          <BookPdfFlipbook pdfUrl={SAMPLE_BOOK.pdf} />
        </Suspense>
      </div>
    </ModalOverlay>
  );
}

export function TopicProduct({ topic }: { topic: Topic }) {
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <Section id="produkt">
      <SectionHeading sub={SECTION_COPY.product.sub}>{SECTION_COPY.product.heading}</SectionHeading>
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-lp-cream rounded-3xl p-6 flex flex-col gap-4">
          <h3 className="font-black text-lp-navy">Książeczka w PDF</h3>
          <img
            src={SAMPLE_BOOK.cover}
            alt={`Okładka przykładowej bajki: ${SAMPLE_BOOK.title}`}
            loading="lazy"
            className="max-w-[240px] rounded-2xl shadow-lg"
            width={700}
            height={989}
          />
          <p className="text-sm text-lp-ink-soft">
            „{SAMPLE_BOOK.title}” — {SAMPLE_BOOK.pages} stron, {SAMPLE_BOOK.chapters} rozdziałów,
            pełne ilustracje.{' '}
            <b className="text-lp-navy">Podobny plik otrzymasz dla Twojego dziecka</b> — z jego
            imieniem, wyglądem i jego wersją tej przygody.
          </p>
          <button
            type="button"
            onClick={() => {
              setViewerOpen(true);
              trackEvent('lp_sample_book_opened', { topicSlug: topic.slug });
            }}
            className="self-start bg-lp-teal text-white font-extrabold text-sm px-5 py-3 rounded-full"
          >
            Zobacz przykładową bajkę
          </button>
        </div>
        <div className="bg-lp-cream rounded-3xl p-6 flex flex-col gap-4">
          <h3 className="font-black text-lp-navy">Książeczka drukowana</h3>
          <GalleryWithLightbox photos={PRINT_GALLERY} />
          <p className="text-xs text-lp-ink-soft">
            Prawdziwe zdjęcia, bez filtrów — kliknij, żeby powiększyć.
          </p>
        </div>
      </div>
      {viewerOpen && <SampleBookModal onClose={() => setViewerOpen(false)} />}
    </Section>
  );
}
