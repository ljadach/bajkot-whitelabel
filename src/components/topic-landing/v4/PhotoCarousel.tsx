import { useRef, useState } from 'react';
import type { GalleryPhoto } from '../../../data/lpContent';
import { cycle } from './cycle';

/**
 * Hero photo carousel — arrows, dots, touch swipe. Renders the first photo
 * on the server, so SSG output shows a real image without hydration flicker.
 */
export function PhotoCarousel({
  photos,
  className = '',
}: {
  photos: GalleryPhoto[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);

  const step = (d: number) => setIndex((i) => cycle(i, d, photos.length));
  const photo = photos[index];

  return (
    <div
      className={`relative rounded-3xl overflow-hidden shadow-2xl shadow-lp-navy/20 ${className}`}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <img
        src={photo.src}
        alt={photo.caption}
        className="w-full aspect-[4/3] object-cover select-none"
        width={1100}
        height={825}
        fetchPriority={index === 0 ? 'high' : undefined}
      />
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Poprzednie zdjęcie"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white text-lp-navy text-xl font-black shadow-md flex items-center justify-center"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Następne zdjęcie"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white text-lp-navy text-xl font-black shadow-md flex items-center justify-center"
      >
        ›
      </button>
      <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
        {photos.map((p, i) => (
          <button
            key={p.src}
            type="button"
            aria-label={`Zdjęcie ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`w-2 h-2 rounded-full ${i === index ? 'bg-white' : 'bg-white/55'}`}
          />
        ))}
      </div>
    </div>
  );
}
