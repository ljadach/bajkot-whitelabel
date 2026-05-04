import { useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

/**
 * Resolve a presigned R2 URL on the client when the backend reports the
 * typst-render path produced an R2 object. For the legacy Convex-storage
 * path the caller already has a usable `directUrl` and we pass that
 * through unchanged.
 *
 * Returns `null` while the action is in flight or when neither source
 * is available; consumers can treat null as "loading" or "missing".
 */
export function useResolvedR2Url(opts: {
  orderId: Id<'bookOrders'> | undefined;
  flow: 'auth' | 'landing';
  kind: 'full' | 'preview';
  r2Key: string | null | undefined;
  directUrl: string | null | undefined;
}): string | null {
  const { orderId, flow, kind, r2Key, directUrl } = opts;
  const [resolved, setResolved] = useState<string | null>(null);
  const resolveAuth = useAction(api.bookPipeline.resolveR2DownloadUrl);
  const resolveLanding = useAction(api.bookPipeline.resolveLandingR2DownloadUrl);

  useEffect(() => {
    if (!orderId || !r2Key) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    const resolver = flow === 'landing' ? resolveLanding : resolveAuth;
    resolver({ orderId, kind })
      .then((url) => {
        if (!cancelled) setResolved(url);
      })
      .catch(() => {
        if (!cancelled) setResolved(null);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, r2Key, kind, flow, resolveAuth, resolveLanding]);

  if (directUrl) return directUrl;
  return resolved;
}
