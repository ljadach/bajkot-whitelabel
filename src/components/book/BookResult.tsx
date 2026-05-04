import { Suspense, lazy, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { useAction, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { trackEvent } from '@lib/telemetry';
import { BOOK_PRICE_PDF_PLN, formatPricePLN } from '@lib/pricing';
import { ClientOnly } from '../ClientOnly';
import { genitiveOrSelf } from '@lib/childNameInflect';
import { useResolvedR2Url } from '../../hooks/useResolvedR2Url';

// PDF viewer is heavy (pdfjs-dist + react-pdf + react-pageflip ~500KB gz).
// Lazy-load so the success-screen path (post-payment) doesn't pull it in.
const BookPdfFlipbook = lazy(() =>
  import('./BookPdfFlipbook').then((m) => ({ default: m.BookPdfFlipbook })),
);

const PRINT_REQUEST_EMAIL = 'info@bajkoterapia.org';

function buildPrintRequestMailto(bookOrderId?: string, childName?: string | null): string {
  const subject = encodeURIComponent('Wydruk bajki — zamówienie wersji drukowanej');
  const lines = [
    'Cześć,',
    '',
    'Chciałabym/chciałbym zamówić wydrukowaną wersję bajki.',
    '',
    childName ? `Imię dziecka: ${childName}` : null,
    bookOrderId ? `Numer zamówienia: ${bookOrderId}` : null,
    '',
    'Adres do wysyłki:',
    '— Imię i nazwisko:',
    '— Ulica i numer:',
    '— Kod pocztowy i miejscowość:',
    '— Telefon:',
  ].filter(Boolean);
  const body = encodeURIComponent(lines.join('\n'));
  return `mailto:${PRINT_REQUEST_EMAIL}?subject=${subject}&body=${body}`;
}

export function BookResult() {
  const { orderId } = useParams<{ orderId: string }>();

  const data = useQuery(
    api.bookPipeline.getDownloadUrl,
    orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );
  const fullDownloadUrl = useResolvedR2Url({
    orderId: orderId as Id<'bookOrders'> | undefined,
    flow: 'auth',
    kind: 'full',
    r2Key: data?.r2FullKey ?? null,
    directUrl: data?.url ?? null,
  });
  const showPreview = data?.hasPdf === true && data?.paid === false;
  const preview = useQuery(
    api.bookPipeline.getOrderPreview,
    orderId && showPreview ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Order not found</p>
      </div>
    );
  }

  if (showPreview) {
    return (
      <BookPreviewScreen
        preview={preview}
        bookOrderId={orderId}
        flow="auth"
        onUnlock={async () => {
          const session = await createCheckoutSession({
            bookOrderId: orderId as Id<'bookOrders'>,
            returnPath: `/book/${orderId}/result`,
          });
          if (typeof window !== 'undefined') window.location.assign(session.url);
        }}
      />
    );
  }

  return (
    <BookSuccessScreen
      downloadUrl={fullDownloadUrl}
      childName={data?.childName ?? null}
      bookTitle={data?.bookTitle ?? null}
      printHref={`/book/${orderId}/print`}
      upsellTo="/book/order"
      flow="auth"
      bookOrderId={orderId}
    />
  );
}

interface BookSuccessScreenProps {
  downloadUrl: string | null;
  /** Child's name. When combined with bookTitle, drives the personalized heading. */
  childName?: string | null;
  /** Generated book title (from storyDraft). When combined with childName, drives heading. */
  bookTitle?: string | null;
  /** Optional internal link to printer-friendly version. Hidden when omitted. */
  printHref?: string;
  /** Where the upsell CTA should point (auth: order page, landing: home). */
  upsellTo: string;
  /** Funnel branch — used for telemetry attribution. */
  flow?: 'auth' | 'landing';
  /** Order id stamped onto telemetry events. */
  bookOrderId?: string;
}

/**
 * Shared success screen rendered by both auth and landing result pages.
 * Auth flow shows a "print version" link, landing does not.
 */
export function BookSuccessScreen({
  downloadUrl,
  childName,
  bookTitle,
  printHref,
  upsellTo,
  flow,
  bookOrderId,
}: BookSuccessScreenProps) {
  const { t } = useTranslation('book');
  const headingText =
    childName && bookTitle
      ? t('result.heading', { nameGen: genitiveOrSelf(childName), bookTitle })
      : t('result.headingFallback');

  useEffect(() => {
    trackEvent('result_viewed', { flow, bookOrderId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadClick = () => {
    trackEvent('pdf_downloaded', { flow, bookOrderId });
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="text-7xl md:text-8xl">🎉</div>

        <div>
          <span className="text-magic-500 font-bold uppercase tracking-widest text-sm mb-2 block">
            {t('result.kicker')}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-calm-900 mb-3">{headingText}</h1>
          <p className="text-gray-600 text-base md:text-lg max-w-md mx-auto">
            {t('result.description')}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 space-y-6">
          {/* Mock book cover */}
          <div className="bg-gradient-to-br from-calm-500 to-calm-800 rounded-3xl p-8 text-white text-center mx-auto max-w-xs aspect-[3/4] flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-4 left-4 text-5xl">✨</div>
              <div className="absolute bottom-4 right-4 text-5xl">🌟</div>
            </div>
            <div className="text-6xl mb-4">📖</div>
            <h2 className="text-xl md:text-2xl font-black mb-2">Twoja bajka</h2>
            <p className="text-calm-100 text-xs md:text-sm">Bajkoterapia</p>
          </div>

          {downloadUrl ? (
            <div className="flex flex-col items-center gap-3">
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleDownloadClick}
                className="w-full inline-flex items-center justify-center gap-2 bg-magic-500 hover:bg-magic-600 text-white font-extrabold px-8 py-4 rounded-2xl text-lg shadow-xl shadow-magic-500/30 transition transform hover:-translate-y-0.5"
              >
                <i className="fa-solid fa-download" />
                {t('result.download')}
              </a>
              <a
                href={buildPrintRequestMailto(bookOrderId, childName)}
                onClick={() => trackEvent('print_requested_from_result', { flow, bookOrderId })}
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-calm-300 bg-white px-6 py-2.5 text-sm font-bold text-calm-800 hover:border-calm-500 transition"
              >
                <i className="fa-solid fa-truck" />
                {t('result.requestPrint')}
              </a>
              {printHref && (
                <Link
                  to={printHref}
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-calm-200 bg-calm-50 px-6 py-2.5 text-sm font-bold text-calm-800 hover:border-calm-500 transition"
                >
                  <i className="fa-solid fa-print" />
                  {t('result.printVersion')}
                </Link>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-3">
              <div className="w-4 h-4 spinner" />
              <span className="text-sm text-gray-500">{t('result.processing')}</span>
            </div>
          )}
        </div>

        {/* Delivery info — sets expectations for both formats. */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-7 grid sm:grid-cols-2 gap-4 text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-magic-50 text-magic-600 rounded-2xl flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-bolt" />
            </div>
            <div>
              <p className="font-bold text-calm-900 text-sm">{t('result.deliveryPdfHeading')}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{t('result.deliveryPdfBody')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-calm-50 text-calm-700 rounded-2xl flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-truck" />
            </div>
            <div>
              <p className="font-bold text-calm-900 text-sm">{t('result.deliveryPrintHeading')}</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                {t('result.deliveryPrintBody')}
              </p>
            </div>
          </div>
        </div>

        {/* Upsell — create another book */}
        <div className="bg-calm-50 rounded-3xl p-8 border border-calm-100 text-left">
          <h2 className="text-xl font-black text-calm-900 mb-2">
            <i className="fa-solid fa-book text-magic-500 mr-2" />
            {t('result.upsellHeading')}
          </h2>
          <p className="text-gray-600 mb-4">{t('result.upsellBody')}</p>
          <Link
            to={upsellTo}
            className="inline-flex items-center gap-2 bg-calm-500 hover:bg-calm-800 text-white font-bold px-6 py-3 rounded-full transition shadow-md"
          >
            <i className="fa-solid fa-plus" />
            {t('result.createAnother')}
          </Link>
        </div>
      </div>
    </div>
  );
}

interface BookPreviewScreenProps {
  preview:
    | {
        childName: string;
        bookTitle: string | null;
        excerptPl: string | null;
        illustrations: Array<{ illustrationId: string; url: string | null }>;
        previewPdfUrl: string | null;
        r2PreviewKey: string | null;
      }
    | undefined;
  bookOrderId: string;
  flow: 'auth' | 'landing';
  onUnlock: () => Promise<void>;
}

/**
 * Pre-payment teaser shown when the pipeline has produced a PDF but the
 * parent hasn't paid yet. Renders the cover + first two illustrations and a
 * trimmed excerpt of beat 1, with a Stripe Checkout CTA gating the full PDF.
 */
export function BookPreviewScreen({
  preview,
  bookOrderId,
  flow,
  onUnlock,
}: BookPreviewScreenProps) {
  const { t } = useTranslation('book');
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewPdfUrl = useResolvedR2Url({
    orderId: bookOrderId as Id<'bookOrders'>,
    flow,
    kind: 'preview',
    r2Key: preview?.r2PreviewKey ?? null,
    directUrl: preview?.previewPdfUrl ?? null,
  });

  useEffect(() => {
    trackEvent('preview_paywall_viewed', { flow, bookOrderId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnlock = async () => {
    setRedirecting(true);
    setError(null);
    try {
      trackEvent('preview_paywall_unlock_clicked', { flow, bookOrderId });
      await onUnlock();
    } catch (e) {
      setRedirecting(false);
      setError(e instanceof Error ? e.message : t('paywall.error'));
    }
  };

  const heading = preview?.bookTitle
    ? t('paywall.heading', { bookTitle: preview.bookTitle })
    : t('paywall.headingFallback');

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <span className="text-magic-500 font-bold uppercase tracking-widest text-sm mb-2 block">
            {t('paywall.kicker')}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-calm-900 mb-3">{heading}</h1>
          <p className="text-gray-600 text-base md:text-lg max-w-md mx-auto">
            {t('paywall.description', { nameGen: genitiveOrSelf(preview?.childName) })}
          </p>
        </div>

        {/* Preview — embedded flipbook of the first 3 PDF pages. Falls back
            to the legacy 3-image grid for legacy orders whose composer ran
            before the preview PDF feature shipped (previewPdfUrl === null). */}
        {previewPdfUrl ? (
          <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6 md:p-8">
            <ClientOnly
              fallback={
                <div className="flex items-center justify-center gap-2 py-12">
                  <div className="w-5 h-5 spinner" />
                  <span className="text-sm text-gray-500">Ładowanie podglądu...</span>
                </div>
              }
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center gap-2 py-12">
                    <div className="w-5 h-5 spinner" />
                    <span className="text-sm text-gray-500">Ładowanie podglądu...</span>
                  </div>
                }
              >
                <BookPdfFlipbook pdfUrl={previewPdfUrl} />
              </Suspense>
            </ClientOnly>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-4">
              {(
                preview?.illustrations ?? [
                  { illustrationId: 'cover', url: null },
                  { illustrationId: 'scene_1', url: null },
                  { illustrationId: 'scene_2', url: null },
                ]
              ).map((ill, idx) => (
                <div
                  key={ill.illustrationId}
                  className="aspect-square bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden flex items-center justify-center"
                >
                  {ill.url ? (
                    <img
                      src={ill.url}
                      alt={t(`paywall.illustrationAlt.${ill.illustrationId}`, {
                        defaultValue: `Strona ${idx + 1}`,
                      })}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-6 h-6 spinner" />
                  )}
                </div>
              ))}
            </div>
            {preview && (
              <p className="text-xs text-gray-400 text-center">
                Podgląd PDF niedostępny dla tego zamówienia.
              </p>
            )}
          </>
        )}

        {/* Excerpt teaser */}
        {preview?.excerptPl && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-wider text-magic-500 mb-3">
              {t('paywall.excerptKicker')}
            </p>
            <p className="text-base md:text-lg text-calm-900 leading-relaxed font-medium">
              „{preview.excerptPl}"
            </p>
          </div>
        )}

        {/* Unlock CTA */}
        <div className="bg-white rounded-3xl shadow-xl border-2 border-magic-200 p-6 md:p-10 text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h2 className="text-xl md:text-2xl font-black text-calm-900">
            {t('paywall.unlockHeading')}
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">{t('paywall.unlockBody')}</p>
          {error && (
            <div role="alert" className="text-sm text-red-600 font-medium">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleUnlock()}
            disabled={redirecting}
            className="inline-flex items-center justify-center gap-2 bg-magic-500 hover:bg-magic-600 text-white font-extrabold px-8 py-4 rounded-2xl text-lg shadow-xl shadow-magic-500/30 transition transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-lock-open" />
            {redirecting
              ? t('paywall.redirecting')
              : t('paywall.unlockCta', { price: formatPricePLN(BOOK_PRICE_PDF_PLN) })}
          </button>
          <p className="text-xs text-gray-500">{t('paywall.secureNote')}</p>
        </div>
      </div>
    </div>
  );
}
