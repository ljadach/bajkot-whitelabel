import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Prototype "Bajkoteka" — Spotify-like video-bajka player. Assets are generated
// one-off (ElevenLabs TTS with char-level timestamps + pipeline illustrations)
// and served statically from /public/proto-player. No backend involved.

type Segment = { text: string; start: number; end: number };

type PlayerPage = {
  beatId: string;
  audio: string;
  duration: number;
  images: string[];
  segments: Segment[];
};

type Book = {
  slug: string;
  title: string;
  subtitle: string;
  childName: string;
  problemTitle: string;
  ageBracket: string;
  cover: string | null;
  moodOpening: string | null;
  moodClosing: string | null;
  pages: PlayerPage[];
};

const BASE = '/proto-player';

function asset(book: Book, file: string | null): string | undefined {
  return file ? `${BASE}/${book.slug}/${file}` : undefined;
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function bookDuration(book: Book): number {
  return book.pages.reduce((acc, p) => acc + p.duration, 0);
}

export function AdminPlayer() {
  const [library, setLibrary] = useState<Book[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Book | null>(null);

  useEffect(() => {
    fetch(`${BASE}/library.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setLibrary(d.books))
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="rounded-3xl bg-neutral-950 text-white p-8 min-h-[70vh]">
        <div className="mb-8">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">
            Prototyp · Wideobajka terapeutyczna
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Bajkoteka</h1>
          <p className="text-neutral-400 mt-1 text-sm">
            Twoje bajki jako filmy — lektor, ilustracje i napisy zsynchronizowane co do sekundy.
          </p>
        </div>

        {error && (
          <div className="text-red-400 text-sm">
            Nie mogę wczytać biblioteki ({error}). Czy assety w{' '}
            <code className="text-red-300">public/proto-player/</code> są wygenerowane?
          </div>
        )}
        {!library && !error && <div className="text-neutral-500 text-sm">Wczytywanie…</div>}

        {library && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {library.map((book) => (
              <button
                key={book.slug}
                onClick={() => setActive(book)}
                className="group text-left rounded-2xl overflow-hidden bg-neutral-900 hover:bg-neutral-800 transition-colors ring-1 ring-neutral-800"
              >
                <div className="relative aspect-[2/3] overflow-hidden">
                  {asset(book, book.cover) && (
                    <img
                      src={asset(book, book.cover)}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="font-bold leading-tight drop-shadow">{book.title}</div>
                    <div className="text-[11px] text-neutral-300 mt-0.5">
                      {book.problemTitle} · {book.ageBracket} lat · {fmtTime(bookDuration(book))}
                    </div>
                  </div>
                  <div className="absolute right-3 top-3 w-11 h-11 rounded-full bg-emerald-500 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    <PlayIcon className="w-5 h-5 translate-x-[1px]" />
                  </div>
                </div>
              </button>
            ))}
            <div className="rounded-2xl border border-dashed border-neutral-800 flex items-center justify-center aspect-[2/3] text-neutral-600 text-sm text-center px-6">
              Kolejna bajka
              <br />
              wkrótce…
            </div>
          </div>
        )}
      </div>

      {active && <PlayerView book={active} onClose={() => setActive(null)} />}
    </div>
  );
}

// ── Full-screen player ───────────────────────────────────────

function PlayerView({ book, onClose }: { book: Book; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [ended, setEnded] = useState(false);
  const [started, setStarted] = useState(false);

  const page = book.pages[pageIdx];
  const totalDuration = useMemo(() => bookDuration(book), [book]);
  const pageOffsets = useMemo(() => {
    const offs: number[] = [];
    let acc = 0;
    for (const p of book.pages) {
      offs.push(acc);
      acc += p.duration;
    }
    return offs;
  }, [book]);

  // current sentence + which of the page's images should be on screen;
  // in the tiny gaps between sentences keep the previous one on screen
  const segIdx = page.segments.findIndex((s) => time >= s.start && time <= s.end);
  const passedCount = page.segments.filter((s) => s.start <= time).length;
  const activeSeg =
    segIdx >= 0 ? page.segments[segIdx] : passedCount > 0 ? page.segments[passedCount - 1] : null;
  const imgCount = Math.max(page.images.length, 1);
  const rawSegIdx = segIdx >= 0 ? segIdx : Math.max(passedCount - 1, 0);
  const imgIdx = Math.min(
    Math.floor((rawSegIdx * imgCount) / Math.max(page.segments.length, 1)),
    imgCount - 1,
  );
  const currentImage = page.images[imgIdx]
    ? asset(book, page.images[imgIdx])
    : asset(book, book.cover);

  const loadPage = useCallback(
    (idx: number, offsetSec = 0, autoplay = true) => {
      const audio = audioRef.current;
      if (!audio) return;
      setPageIdx(idx);
      setEnded(false);
      audio.src = `${BASE}/${book.slug}/${book.pages[idx].audio}`;
      audio.currentTime = offsetSec;
      setTime(offsetSec);
      if (autoplay) {
        void audio.play();
        setPlaying(true);
      }
    },
    [book],
  );

  const start = useCallback(() => {
    setStarted(true);
    loadPage(0);
  }, [loadPage]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (ended) {
      loadPage(0);
      return;
    }
    if (!started) {
      start();
      return;
    }
    if (audio.paused) {
      void audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, [ended, started, start, loadPage]);

  const seekGlobal = useCallback(
    (globalT: number) => {
      let idx = book.pages.length - 1;
      for (let i = 0; i < book.pages.length; i++) {
        if (globalT < pageOffsets[i] + book.pages[i].duration) {
          idx = i;
          break;
        }
      }
      if (!started) setStarted(true);
      loadPage(idx, Math.max(0, globalT - pageOffsets[idx]), playing || !started);
    },
    [book, pageOffsets, loadPage, playing, started],
  );

  const onAudioEnded = useCallback(() => {
    if (pageIdx < book.pages.length - 1) {
      loadPage(pageIdx + 1);
    } else {
      setPlaying(false);
      setEnded(true);
    }
  }, [pageIdx, book, loadPage]);

  // preload next chapter's audio so page transitions are seamless
  useEffect(() => {
    const next = book.pages[pageIdx + 1];
    if (!next) return;
    const preload = new Audio();
    preload.preload = 'auto';
    preload.src = `${BASE}/${book.slug}/${next.audio}`;
  }, [book, pageIdx]);

  // keyboard: space = play/pause, esc = close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, onClose]);

  const globalTime = pageOffsets[pageIdx] + time;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col">
      <style>{`
        @keyframes kb-a { from { transform: scale(1.05) translate(0.8%, 0.8%); } to { transform: scale(1.16) translate(-0.8%, -0.8%); } }
        @keyframes kb-b { from { transform: scale(1.16) translate(-0.8%, 0.8%); } to { transform: scale(1.05) translate(0.8%, -0.8%); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onEnded={onAudioEnded}
      />

      <div className="flex-1 flex min-h-0">
        {/* scene */}
        <div className="relative flex-1 overflow-hidden">
          {!started && (
            <IntroScreen
              book={book}
              onStart={start}
              image={asset(book, book.moodOpening) ?? asset(book, book.cover)}
            />
          )}

          {started && !ended && currentImage && (
            <div
              key={`${pageIdx}-${imgIdx}`}
              className="absolute inset-0"
              style={{ animation: 'fade-in 0.9s ease both' }}
            >
              <img
                src={currentImage}
                alt=""
                className="w-full h-full object-cover"
                style={{
                  animation: `${imgIdx % 2 === 0 ? 'kb-a' : 'kb-b'} 24s ease-in-out both`,
                }}
              />
            </div>
          )}

          {started && ended && (
            <EndScreen
              book={book}
              image={asset(book, book.moodClosing) ?? asset(book, book.cover)}
              onReplay={() => loadPage(0)}
            />
          )}

          {/* night mode dim */}
          {nightMode && <div className="absolute inset-0 bg-black/80 pointer-events-none" />}

          {/* subtitle */}
          {started && !ended && (
            <div className="absolute inset-x-0 bottom-0 pb-8 pt-24 px-8 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex justify-center">
              <p
                key={activeSeg?.start ?? -1}
                className="max-w-3xl text-center text-lg md:text-2xl font-medium leading-snug drop-shadow-lg"
                style={{ animation: 'fade-in 0.35s ease both' }}
              >
                {activeSeg?.text ?? ''}
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
            title="Zamknij (Esc)"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* chapters */}
        <div className="w-72 shrink-0 bg-neutral-950 border-l border-neutral-900 flex-col hidden lg:flex">
          <div className="p-5 border-b border-neutral-900">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">
              Teraz odtwarzane
            </div>
            <div className="font-bold leading-tight">{book.title}</div>
            <div className="text-xs text-neutral-400 mt-1">{book.problemTitle} · czyta lektor</div>
          </div>
          <div className="flex-1 overflow-auto py-2">
            {book.pages.map((p, i) => (
              <button
                key={p.beatId}
                onClick={() => seekGlobal(pageOffsets[i])}
                className={`w-full text-left px-5 py-3 flex items-center gap-3 transition-colors ${
                  i === pageIdx && started
                    ? 'bg-neutral-900 text-emerald-400'
                    : 'text-neutral-300 hover:bg-neutral-900/60'
                }`}
              >
                <span className="text-xs w-5 text-neutral-500">{i + 1}</span>
                <span className="flex-1 text-sm">Rozdział {i + 1}</span>
                <span className="text-xs text-neutral-500">{fmtTime(p.duration)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* transport bar */}
      <div className="bg-neutral-950 border-t border-neutral-900 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => seekGlobal(Math.max(0, pageOffsets[Math.max(0, pageIdx - 1)]))}
          className="text-neutral-400 hover:text-white transition-colors"
          title="Poprzedni rozdział"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>
        <button
          onClick={togglePlay}
          className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
          title="Odtwórz / pauza (spacja)"
        >
          {playing ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
            </svg>
          ) : (
            <PlayIcon className="w-5 h-5 translate-x-[1px]" />
          )}
        </button>
        <button
          onClick={() => seekGlobal(pageOffsets[Math.min(book.pages.length - 1, pageIdx + 1)])}
          className="text-neutral-400 hover:text-white transition-colors"
          title="Następny rozdział"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" />
          </svg>
        </button>

        <span className="text-xs text-neutral-400 tabular-nums w-10 text-right">
          {fmtTime(globalTime)}
        </span>
        <input
          type="range"
          min={0}
          max={totalDuration}
          step={0.5}
          value={globalTime}
          onChange={(e) => seekGlobal(Number(e.target.value))}
          className="flex-1 accent-emerald-500 h-1"
        />
        <span className="text-xs text-neutral-400 tabular-nums w-10">{fmtTime(totalDuration)}</span>

        <button
          onClick={() => setNightMode((v) => !v)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
            nightMode
              ? 'border-emerald-500 text-emerald-400'
              : 'border-neutral-700 text-neutral-400 hover:text-white'
          }`}
          title="Tryb nocny — przyciemnia obraz do zasypiania"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
            />
          </svg>
          Tryb nocny
        </button>
      </div>
    </div>
  );
}

function IntroScreen({
  book,
  image,
  onStart,
}: {
  book: Book;
  image?: string;
  onStart: () => void;
}) {
  return (
    <div className="absolute inset-0">
      {image && <img src={image} alt="" className="w-full h-full object-cover opacity-40" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
        <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-3">
          Wideobajka dla: {book.childName}
        </div>
        <h2 className="text-4xl md:text-5xl font-bold mb-2 drop-shadow">{book.title}</h2>
        {book.subtitle && <p className="text-neutral-300 mb-8 max-w-xl">{book.subtitle}</p>}
        <button
          onClick={onStart}
          className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-4 rounded-full transition-colors shadow-xl"
        >
          <PlayIcon className="w-5 h-5" />
          Odtwórz bajkę
        </button>
      </div>
    </div>
  );
}

function EndScreen({
  book,
  image,
  onReplay,
}: {
  book: Book;
  image?: string;
  onReplay: () => void;
}) {
  return (
    <div className="absolute inset-0">
      {image && <img src={image} alt="" className="w-full h-full object-cover opacity-50" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
        <h2 className="text-3xl font-bold mb-2">Koniec</h2>
        <p className="text-neutral-300 mb-8">Dobranoc, {book.childName} 🌙</p>
        <button
          onClick={onReplay}
          className="flex items-center gap-2 border border-neutral-500 hover:border-white px-6 py-3 rounded-full text-sm font-medium transition-colors"
        >
          Odtwórz jeszcze raz
        </button>
      </div>
    </div>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
