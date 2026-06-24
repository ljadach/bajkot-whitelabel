import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PreviewPage {
  /** Path under public/ — sample spread from a real generated book. */
  src: string;
  /** i18n key (under previewScreen) for the page caption. */
  labelKey: string;
}

/**
 * Real sample pages copied to public/illustrations/sample-book/.
 * Order mirrors the reading flow: cover → story text → illustration → parent guide.
 */
const PAGES: PreviewPage[] = [
  { src: '/illustrations/sample-book/sample-01-cover.jpg', labelKey: 'previewScreen.sampleCover' },
  { src: '/illustrations/sample-book/sample-02-text.jpg', labelKey: 'previewScreen.sampleText' },
  {
    src: '/illustrations/sample-book/sample-03-illustration.jpg',
    labelKey: 'previewScreen.sampleIllustration',
  },
  {
    src: '/illustrations/sample-book/sample-04-parent.jpg',
    labelKey: 'previewScreen.sampleParent',
  },
];

/**
 * Swipeable preview of a real sample book. Replaces the old empty gradient mock
 * on the "Co otrzymasz?" screen so parents see actual pages before ordering.
 *
 * Native horizontal scroll-snap drives the carousel (works with touch/trackpad),
 * arrows + dots stay in sync via the scroll position.
 */
export function BookPreviewCarousel() {
  const { t } = useTranslation('book');
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const goTo = useCallback((target: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(PAGES.length - 1, target));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' });
  }, []);

  // Keep the active index in sync with manual swipes/scrolls.
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.round(track.scrollLeft / track.clientWidth);
    setIndex(Math.max(0, Math.min(PAGES.length - 1, next)));
  }, []);

  const atStart = index === 0;
  const atEnd = index === PAGES.length - 1;

  return (
    <div className="space-y-4">
      <div className="relative rounded-3xl bg-gradient-to-br from-calm-50 to-white p-3 shadow-2xl border border-calm-100">
        {/* Scroll-snap track */}
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl scroll-smooth no-scrollbar"
        >
          {PAGES.map((page, i) => (
            <div key={page.src} className="w-full shrink-0 snap-center">
              <div className="aspect-[451/640] overflow-hidden rounded-2xl bg-white shadow-inner ring-1 ring-black/5">
                <img
                  src={page.src}
                  alt={t(page.labelKey)}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                  className="h-full w-full object-cover select-none"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Page caption + counter overlay */}
        <div className="pointer-events-none absolute left-5 bottom-5 flex items-center gap-2">
          <span className="rounded-full bg-calm-900/75 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
            {t(PAGES[index].labelKey)}
          </span>
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-calm-700 backdrop-blur-sm">
            {t('previewScreen.sampleCounter', { current: index + 1, total: PAGES.length })}
          </span>
        </div>
      </div>

      {/* Control bar: prev — dots — next (below the image so it never covers a page) */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={atStart}
          aria-label={t('previewScreen.samplePrev')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-calm-700 shadow-md ring-1 ring-calm-100 transition hover:bg-calm-50 hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <i className="fa-solid fa-chevron-left" />
        </button>

        <div className="flex items-center gap-2">
          {PAGES.map((page, i) => (
            <button
              key={page.src}
              type="button"
              onClick={() => goTo(i)}
              aria-label={t('previewScreen.sampleGoTo', { n: i + 1 })}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-6 bg-magic-500' : 'w-2 bg-gray-200 hover:bg-gray-300'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={atEnd}
          aria-label={t('previewScreen.sampleNext')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-calm-700 shadow-md ring-1 ring-calm-100 transition hover:bg-calm-50 hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <i className="fa-solid fa-chevron-right" />
        </button>
      </div>

      {/* Swipe hint */}
      <p className="text-center text-xs text-gray-400">
        <i className="fa-solid fa-hand-pointer mr-1" />
        {t('previewScreen.sampleHint')}
      </p>
    </div>
  );
}
