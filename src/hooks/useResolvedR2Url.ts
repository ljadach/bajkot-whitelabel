import { useEffect, useRef, useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

// Presign z backendu żyje godzinę (DEFAULT_TTL_SECONDS w convex/lib/r2Presign).
// Odświeżamy z zapasem, żeby link w DOM-ie nigdy nie był martwy: zakładka z
// podglądem potrafi wisieć otwarta pół dnia, a kliknięcie w wygasły URL
// oddaje XML z <Code>ExpiredRequest</Code> zamiast PDF-a.
const REFRESH_INTERVAL_MS = 45 * 60 * 1000;
/** Po powrocie do zakładki odświeżamy tylko URL starszy niż to. */
const STALE_AFTER_MS = 20 * 60 * 1000;

/**
 * Resolve a presigned R2 URL on the client when the backend reports the
 * typst-render path produced an R2 object. For the legacy Convex-storage
 * path the caller already has a usable `directUrl` and we pass that
 * through unchanged.
 *
 * The URL refreshes itself while the component stays mounted (interval +
 * powrót do zakładki), so a link rendered an hour ago still works on click.
 * Konsumenci renderujący PDF (viewer, iframe) powinni przypiąć pierwszy
 * URL — patrz `BookPdfFlipbook` — bo świeży podpis to inny string i naiwne
 * przekazanie go dalej przeładowuje cały plik.
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
  /** Required for landing flow — capability token bound to the order. */
  accessToken?: string | null;
}): string | null {
  const { orderId, flow, kind, r2Key, directUrl, accessToken } = opts;
  const [resolved, setResolved] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const resolvedAtRef = useRef(Date.now());
  const resolveAuth = useAction(api.bookPipeline.resolveR2DownloadUrl);
  const resolveLanding = useAction(api.bookPipeline.resolveLandingR2DownloadUrl);

  // Legacy zamówienia mają `directUrl` z Convex storage i nie potrzebują
  // presignu — wtedy ani nie wołamy akcji, ani nie zawieszamy timera.
  const needsResolve = !directUrl && !!orderId && !!r2Key && (flow !== 'landing' || !!accessToken);

  useEffect(() => {
    if (!needsResolve || !orderId) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    const promise =
      flow === 'landing'
        ? resolveLanding({ orderId, kind, accessToken: accessToken ?? '' })
        : resolveAuth({ orderId, kind });
    promise
      .then((url) => {
        if (cancelled) return;
        resolvedAtRef.current = Date.now();
        setResolved(url);
      })
      .catch(() => {
        // Nie kasujemy poprzedniego URL-a: przy nieudanym odświeżeniu lepszy
        // jest link sprzed chwili niż zniknięcie przycisku pobierania.
        if (!cancelled && nonce === 0) setResolved(null);
      });
    return () => {
      cancelled = true;
    };
  }, [needsResolve, orderId, kind, flow, accessToken, nonce, resolveAuth, resolveLanding]);

  // Odświeżanie: cyklicznie oraz po powrocie do zakładki, jeśli URL zdążył
  // się zestarzeć. Bez tego link wyrenderowany raz zostaje w DOM-ie na zawsze
  // i po godzinie prowadzi do wygasłego presigna.
  useEffect(() => {
    if (!needsResolve) return;
    const bump = () => setNonce((n) => n + 1);
    const timer = window.setInterval(bump, REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - resolvedAtRef.current > STALE_AFTER_MS) bump();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [needsResolve]);

  return directUrl ?? resolved;
}
