import { useEffect, useState } from 'react';
import type { GalleryPhoto } from '../../../data/lpContent';
import { trackEvent } from '../../../lib/telemetry';
import { ModalOverlay } from './ModalOverlay';
import { cycle } from './cycle';

/**
 * Clickable photo grid + fullscreen lightbox (arrows, Esc, counter) —
 * e-commerce style gallery for the printed-book photos.
 */
export function GalleryWithLightbox({ photos }: { photos: GalleryPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const isOpen = open !== null;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setOpen((i) => cycle(i!, -1, photos.length));
      if (e.key === 'ArrowRight') setOpen((i) => cycle(i!, 1, photos.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, photos.length]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {photos.map((p, i) => (
          <button
            key={p.src}
            type="button"
            onClick={() => {
              setOpen(i);
              trackEvent('lp_print_gallery_opened', { photo: p.src, index: i });
            }}
            aria-label={`Powiększ: ${p.caption}`}
            className="relative rounded-2xl overflow-hidden group"
          >
            <img
              src={p.src}
              alt={p.caption}
              loading="lazy"
              className="w-full aspect-[4/3] object-cover transition-transform group-hover:scale-105"
            />
            <span className="absolute right-2 bottom-2 w-7 h-7 rounded-full bg-white/85 flex items-center justify-center text-xs">
              🔍
            </span>
          </button>
        ))}
      </div>
      {open !== null && (
        <ModalOverlay
          onClose={() => setOpen(null)}
          label="Podgląd zdjęcia"
          className="flex flex-col items-center justify-center gap-3 p-5"
        >
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Zamknij"
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={() => setOpen((i) => cycle(i!, -1, photos.length))}
            aria-label="Poprzednie zdjęcie"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl"
          >
            ‹
          </button>
          <img
            src={photos[open].src}
            alt={photos[open].caption}
            className="max-h-[78vh] max-w-[92vw] rounded-xl shadow-2xl"
          />
          <p className="text-slate-300 text-sm">
            {photos[open].caption} ({open + 1}/{photos.length})
          </p>
          <button
            type="button"
            onClick={() => setOpen((i) => cycle(i!, 1, photos.length))}
            aria-label="Następne zdjęcie"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl"
          >
            ›
          </button>
        </ModalOverlay>
      )}
    </>
  );
}
