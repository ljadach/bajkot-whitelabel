import { useEffect, useRef } from 'react';

/* ── Cloudflare Stream Player SDK loader ───────────────────────
   The SDK exposes a global `Stream(iframe)` function that wraps
   an existing <iframe> and gives programmatic control:
   .currentTime, .play(), .pause(), addEventListener('timeupdate')
   ─────────────────────────────────────────────────────────────── */

interface StreamPlayer {
  currentTime: number;
  duration: number;
  play(): void;
  pause(): void;
  addEventListener(event: string, cb: () => void): void;
  removeEventListener(event: string, cb: () => void): void;
}

declare global {
  var Stream: ((iframe: HTMLIFrameElement) => StreamPlayer) | undefined;
}

let sdkPromise: Promise<void> | null = null;

function ensureStreamSdk(): Promise<void> {
  if (window.Stream) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://embed.cloudflarestream.com/embed/sdk.latest.js';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return sdkPromise;
}

/* ── Helpers ───────────────────────────────────────────────────── */

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/* ── Component ─────────────────────────────────────────────────── */

interface LessonVideoEmbedProps {
  cloudflareStreamUid: string;
  cloudflareCustomerSubdomain: string;
  startSeconds: number;
  endSeconds: number;
  title: string;
  /** Inline mode: autoplay + loop + muted for scroll-reader context */
  inline?: boolean;
}

export function LessonVideoEmbed({ cloudflareStreamUid, cloudflareCustomerSubdomain, startSeconds, endSeconds, title, inline }: LessonVideoEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<StreamPlayer | null>(null);

  // Build iframe URL — only use params Cloudflare actually supports
  // NOTE: endTime is NOT a valid iframe param — segment boundary
  // is enforced via the SDK's timeupdate listener below
  const params = new URLSearchParams({
    startTime: String(startSeconds),
    loop: 'false', // we handle looping manually for segment precision
    autoplay: inline ? 'true' : 'false',
    muted: inline ? 'true' : 'false',
    preload: inline ? 'auto' : 'metadata',
  });
  const src = `https://customer-${cloudflareCustomerSubdomain}.cloudflarestream.com/${cloudflareStreamUid}/iframe?${params}`;

  // Attach SDK player to enforce segment loop
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let cancelled = false;
    let player: StreamPlayer | null = null;

    const setup = async () => {
      await ensureStreamSdk();
      if (cancelled || !window.Stream || !iframeRef.current) return;
      player = window.Stream(iframeRef.current);
      playerRef.current = player;

      const handleTimeUpdate = () => {
        if (!player) return;
        // Loop back to segment start when reaching segment end
        if (player.currentTime >= endSeconds) {
          player.currentTime = startSeconds;
        }
      };

      player.addEventListener('timeupdate', handleTimeUpdate);
    };

    void setup();

    return () => {
      cancelled = true;
      playerRef.current = null;
    };
  }, [cloudflareStreamUid, startSeconds, endSeconds]);

  const timecode = `${fmtTime(startSeconds)} – ${fmtTime(endSeconds)}`;

  if (inline) {
    return (
      <div className="scroll-reader-video not-prose">
        <div className="aspect-video">
          <iframe ref={iframeRef} className="w-full h-full" src={src} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        </div>
        <div className="px-4 py-2 bg-neutral-50/80 border-t border-neutral-100">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
            <span className="text-xs font-medium text-neutral-500">{title}</span>
            <span className="text-[10px] font-mono text-neutral-400 ml-auto">{timecode}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900 not-prose">
      <div className="aspect-video">
        <iframe ref={iframeRef} className="w-full h-full" src={src} allow="encrypted-media; picture-in-picture" allowFullScreen />
      </div>
      <div className="px-4 py-2.5 bg-neutral-50 border-t border-neutral-200">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
          </svg>
          <span className="text-sm font-medium text-neutral-700">{title}</span>
          <span className="text-[10px] font-mono text-neutral-400 ml-auto">{timecode}</span>
        </div>
      </div>
    </div>
  );
}

interface VideoEmbedPlaceholderProps {
  title: string;
}

export function VideoEmbedPlaceholder({ title }: VideoEmbedPlaceholderProps) {
  return (
    <div className="my-6 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center not-prose">
      <svg className="w-8 h-8 mx-auto mb-2 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
      </svg>
      <p className="text-sm text-neutral-400">{title}</p>
    </div>
  );
}
