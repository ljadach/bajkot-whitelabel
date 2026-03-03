/**
 * Video player for segment preview — Cloudflare Stream iframe with startTime/endTime.
 */

interface SegmentVideoPlayerProps {
  cloudflareStreamUid?: string;
  cloudflareCustomerSubdomain?: string;
  startSeconds: number;
  endSeconds: number;
}

export function SegmentVideoPlayer({ cloudflareStreamUid, cloudflareCustomerSubdomain, startSeconds, endSeconds }: SegmentVideoPlayerProps) {
  if (!cloudflareStreamUid || !cloudflareCustomerSubdomain) {
    return (
      <div className="aspect-video bg-neutral-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-neutral-400">
          <svg className="w-8 h-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
          </svg>
          <p className="text-xs">Not uploaded to Cloudflare Stream</p>
        </div>
      </div>
    );
  }

  const params = new URLSearchParams({
    startTime: String(startSeconds),
    endTime: String(endSeconds),
    loop: 'true',
    autoplay: 'true',
    muted: 'true',
  });
  const src = `https://customer-${cloudflareCustomerSubdomain}.cloudflarestream.com/${cloudflareStreamUid}/iframe?${params}`;

  return (
    <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden">
      <iframe className="w-full h-full" src={src} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
    </div>
  );
}
