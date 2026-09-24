import { Suspense, lazy, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { BOOK_PRICE_PDF_PLN, BOOK_PRICE_PRINT_PLN, formatPricePLN } from '@lib/pricing';
import { genitiveOrSelf } from '@lib/childNameInflect';
import { ClientOnly } from '../ClientOnly';
import { useResolvedR2Url } from '../../hooks/useResolvedR2Url';
import { usePartner, usePartnerPaths } from '../../hooks/usePartner';

// PDF viewer is heavy (pdfjs-dist + react-pdf). Lazy-loaded on both result
// screens — the pre-payment preview and the success screen — so it never
// lands in the initial bundle.
const BookPdfFlipbook = lazy(() =>
  import('./BookPdfFlipbook').then((m) => ({ default: m.BookPdfFlipbook })),
);

/** Placeholder held in the flipbook's slot while pdfjs and the file load. */
function FlipbookLoading() {
  const { t } = useTranslation('book');
  return (
    <div className="aspect-[5/7] w-full max-w-[560px] mx-auto rounded-2xl bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center gap-2">
      <div className="w-5 h-5 spinner" />
      <span className="text-sm text-gray-500">{t('result.previewLoading')}</span>
    </div>
  );
}

function formatShippingAddress(
  address: { fullName: string; phone: string; street: string; zip: string; city: string } | null,
): string | null {
  if (!address) return null;
  const parts = [address.fullName, address.street, `${address.zip} ${address.city}`.trim()]
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts.join(', ');
}

interface BookSuccessScreenProps {
  downloadUrl: string | null;
  /** Child's name. With bookTitle, drives the personalized heading. */
  childName?: string | null;
  /** Generated book title (from storyDraft). */
  bookTitle?: string | null;
  bookOrderId: string;
  /** Order format — drives the print copy. */
  format?: 'pdf' | 'pdf_print';
  /** Shipping address for pdf_print orders — rendered into the delivery tile. */
  shippingAddress?: {
    fullName: string;
    phone: string;
    street: string;
    zip: string;
    city: string;
  } | null;
}

/** Paid order: the book itself (flipbook), the download button, delivery info. */
export function BookSuccessScreen({
  downloadUrl,
  childName,
  bookTitle,
  bookOrderId,
  format = 'pdf',
  shippingAddress = null,
}: BookSuccessScreenProps) {
  const { t } = useTranslation('book');
  const partner = usePartner();
  const paths = usePartnerPaths();
  const headingText =
    childName && bookTitle
      ? t('result.heading', { nameGen: genitiveOrSelf(childName), bookTitle })
      : t('result.headingFallback');
  const isPrintOrder = format === 'pdf_print';
  const shippingAddressLine = formatShippingAddress(shippingAddress);
  // PDF-only buyers ask for print by e-mail — only possible when the partner
  // has a support address.
  const printRequestHref =
    !isPrintOrder && partner.supportEmail
      ? `mailto:${partner.supportEmail}?${new URLSearchParams({
          subject: t('result.printRequestSubject', {
            orderNo: bookOrderId.slice(-12).toUpperCase(),
          }),
        })
          .toString()
          .replace(/\+/g, '%20')}`
      : null;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="text-7xl md:text-8xl">🎉</div>

        <div>
          <span className="text-accent-ink font-bold uppercase tracking-widest text-sm mb-2 block">
            {t('result.kicker')}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-primary-900 mb-3">{headingText}</h1>
          <p className="text-gray-600 text-base md:text-lg max-w-md mx-auto">
            {t('result.description')}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 space-y-6">
          {/* The bought book itself, page by page. The placeholder cover only
              covers the seconds before the PDF URL resolves. */}
          {downloadUrl ? (
            <ClientOnly fallback={<FlipbookLoading />}>
              <Suspense fallback={<FlipbookLoading />}>
                <BookPdfFlipbook pdfUrl={downloadUrl} />
              </Suspense>
            </ClientOnly>
          ) : (
            <div className="bg-gradient-to-br from-primary-500 to-primary-800 rounded-3xl p-8 text-on-primary text-center mx-auto max-w-xs aspect-[3/4] flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-4 left-4 text-5xl">✨</div>
                <div className="absolute bottom-4 right-4 text-5xl">🌟</div>
              </div>
              <div className="text-6xl mb-4">📖</div>
              <h2 className="text-xl md:text-2xl font-black mb-2">{t('result.coverTitle')}</h2>
              <p className="text-xs md:text-sm opacity-80">{partner.name}</p>
            </div>
          )}

          {downloadUrl ? (
            <div className="flex flex-col items-center gap-3">
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-on-accent font-extrabold px-8 py-4 rounded-2xl text-lg shadow-xl shadow-accent-500/30 transition transform hover:-translate-y-0.5"
              >
                <i className="fa-solid fa-download" />
                {t('result.download')}
              </a>
              {printRequestHref && (
                <a
                  href={printRequestHref}
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-primary-300 bg-white px-6 py-2.5 text-sm font-bold text-primary-800 hover:border-primary-500 transition"
                >
                  <i className="fa-solid fa-truck" />
                  {t('result.requestPrint')}
                </a>
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
            <div className="w-10 h-10 bg-accent-50 text-accent-ink rounded-2xl flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-bolt" />
            </div>
            <div>
              <p className="font-bold text-primary-900 text-sm">{t('result.deliveryPdfHeading')}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{t('result.deliveryPdfBody')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary-50 text-primary-700 rounded-2xl flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-truck" />
            </div>
            <div>
              <p className="font-bold text-primary-900 text-sm">
                {t('result.deliveryPrintHeading')}
              </p>
              <p className="text-gray-500 text-xs leading-relaxed">
                {isPrintOrder
                  ? shippingAddressLine
                    ? t('result.deliveryPrintBodyShipping', { address: shippingAddressLine })
                    : t('result.deliveryPrintBodyShippingNoAddress')
                  : printRequestHref
                    ? t('result.deliveryPrintBodyPdfOnly')
                    : t('result.deliveryPrintBodyPdfOnlyNextTime')}
              </p>
            </div>
          </div>
        </div>

        {/* Another book on a different topic. */}
        <div className="bg-primary-50 rounded-3xl p-8 border border-primary-100 text-left">
          <h2 className="text-xl font-black text-primary-900 mb-2">
            <i className="fa-solid fa-book text-accent-ink mr-2" />
            {t('result.upsellHeading')}
          </h2>
          <p className="text-gray-600 mb-4">{t('result.upsellBody')}</p>
          <Link
            to={paths.start}
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-700 text-on-primary font-bold px-6 py-3 rounded-full transition shadow-md"
          >
            <i className="fa-solid fa-plus" />
            {t('result.createAnother')}
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * PDF vs PDF+print picker on the paywall. Two tiles rather than a dropdown —
 * the print option is the upsell and has to read as an offer, not a setting.
 */
function FormatChoice({
  value,
  onChange,
  disabled,
}: {
  value: 'pdf' | 'pdf_print';
  onChange: (format: 'pdf' | 'pdf_print') => void;
  disabled: boolean;
}) {
  const { t } = useTranslation('book');
  const options = [
    {
      id: 'pdf' as const,
      price: BOOK_PRICE_PDF_PLN,
      title: t('paywall.formatPdfTitle'),
      desc: t('paywall.formatPdfDesc'),
    },
    {
      id: 'pdf_print' as const,
      price: BOOK_PRICE_PRINT_PLN,
      title: t('paywall.formatPrintTitle'),
      desc: t('paywall.formatPrintDesc'),
    },
  ];
  return (
    <fieldset className="text-left space-y-2" disabled={disabled}>
      <legend className="text-sm font-bold text-primary-900 mb-2 text-center w-full">
        {t('paywall.chooseFormat')}
      </legend>
      {options.map((option) => (
        <label
          key={option.id}
          className={`flex gap-3 items-start rounded-2xl border-2 p-4 cursor-pointer transition ${
            value === option.id
              ? 'border-accent-500 bg-accent-50'
              : 'border-gray-200 hover:border-gray-300'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <input
            type="radio"
            name="book-format"
            value={option.id}
            checked={value === option.id}
            onChange={() => onChange(option.id)}
            className="mt-1 accent-accent-500"
          />
          <span className="flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-bold text-primary-900">{option.title}</span>
              <span className="font-black text-primary-900 whitespace-nowrap">
                {formatPricePLN(option.price)}
              </span>
            </span>
            <span className="block text-sm text-gray-500 mt-0.5">{option.desc}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/**
 * Stripe test mode is on (`STRIPE_MODE` ≠ live): tell the viewer how to pay,
 * so a demo session doesn't stall on the card form.
 */
function TestModeNotice() {
  const { t } = useTranslation('book');
  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-3 text-left">
      <p className="text-sm font-black text-amber-900">
        <i className="fa-solid fa-flask mr-2" aria-hidden="true" />
        {t('paywall.testModeTitle')}
      </p>
      <p className="mt-1 text-sm text-amber-900 leading-relaxed">
        {t('paywall.testModeBody')}{' '}
        <span className="font-mono font-bold whitespace-nowrap">4242 4242 4242 4242</span>
      </p>
    </div>
  );
}

interface BookPreviewScreenProps {
  preview:
    | {
        childName: string;
        bookTitle: string | null;
        excerptPl: string | null;
        format: 'pdf' | 'pdf_print';
        hasShippingAddress: boolean;
        problemId: string;
        illustrations: Array<{ illustrationId: string; url: string | null }>;
        previewPdfUrl: string | null;
        r2PreviewKey: string | null;
      }
    | undefined;
  bookOrderId: string;
  onUnlock: (format: 'pdf' | 'pdf_print') => Promise<void>;
  /** Capability token bound to the order. */
  accessToken: string | null;
}

/**
 * Pre-payment teaser shown when the pipeline has produced a PDF but the
 * parent hasn't paid yet: the first pages in the flipbook, a PDF / PDF+print
 * choice and a Stripe Checkout CTA gating the full PDF.
 */
export function BookPreviewScreen({
  preview,
  bookOrderId,
  onUnlock,
  accessToken,
}: BookPreviewScreenProps) {
  const { t } = useTranslation('book');
  const paymentMode = useQuery(api.billing.getPaymentMode);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `null` until preview data arrives — then the order's own format is the
  // default, so an untouched choice bills exactly what it billed before.
  const [chosenFormat, setChosenFormat] = useState<'pdf' | 'pdf_print' | null>(null);
  const format = chosenFormat ?? preview?.format ?? 'pdf';

  const previewPdfUrl = useResolvedR2Url({
    orderId: bookOrderId as Id<'bookOrders'>,
    kind: 'preview',
    r2Key: preview?.r2PreviewKey ?? null,
    directUrl: preview?.previewPdfUrl ?? null,
    accessToken,
  });

  const handleUnlock = async () => {
    setRedirecting(true);
    setError(null);
    try {
      await onUnlock(format);
    } catch (e) {
      setRedirecting(false);
      setError(e instanceof Error ? e.message : t('paywall.error'));
    }
  };

  const heading = preview?.bookTitle
    ? t('paywall.heading', { bookTitle: preview.bookTitle })
    : t('paywall.headingFallback');
  const isPrint = format === 'pdf_print';
  const price = isPrint ? BOOK_PRICE_PRINT_PLN : BOOK_PRICE_PDF_PLN;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-black text-primary-900">{heading}</h1>
          <p className="text-sm text-gray-500 mt-2">{t('paywall.previewLabel')}</p>
        </div>

        {/* Preview — single-page PDF viewer with overlay arrows. The
            illustration grid covers the moment before the PDF URL resolves. */}
        {previewPdfUrl ? (
          <div className="space-y-3">
            <ClientOnly fallback={<FlipbookLoading />}>
              <Suspense fallback={<FlipbookLoading />}>
                <BookPdfFlipbook pdfUrl={previewPdfUrl} />
              </Suspense>
            </ClientOnly>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-500 text-center">
              <span>{t('paywall.usageHint')}</span>
              <a
                href={previewPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 font-semibold text-accent-ink hover:opacity-80 underline underline-offset-2"
              >
                <i className="fa-solid fa-arrow-up-right-from-square" />
                {t('paywall.openInNewTab')}
              </a>
            </div>
          </div>
        ) : (
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
        )}

        {/* Unlock CTA — price follows the selected format. */}
        <div className="bg-white rounded-3xl shadow-xl border-2 border-accent-200 p-6 md:p-10 text-center space-y-4">
          <div className="text-5xl">{isPrint ? '📦' : '🔒'}</div>
          <h2 className="text-xl md:text-2xl font-black text-primary-900">
            {t('paywall.unlockHeading')}
          </h2>
          <FormatChoice
            value={format}
            onChange={setChosenFormat}
            disabled={redirecting || !preview}
          />
          {paymentMode === 'test' && <TestModeNotice />}
          {error && (
            <div role="alert" className="text-sm text-red-600 font-medium">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleUnlock()}
            disabled={redirecting}
            className="inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-on-accent font-extrabold px-8 py-4 rounded-2xl text-lg shadow-xl shadow-accent-500/30 transition transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-lock-open" />
            {redirecting
              ? t('paywall.redirecting')
              : isPrint
                ? t('paywall.unlockCtaPrint', { price: formatPricePLN(price) })
                : t('paywall.unlockCta', { price: formatPricePLN(price) })}
          </button>
          {/* Only promise an address step when Checkout will actually ask —
              orders that came in with an address skip it. */}
          {isPrint && preview?.hasShippingAddress === false && (
            <p className="text-xs text-gray-500">{t('paywall.formatAddressNote')}</p>
          )}
          <p className="text-xs text-gray-500">{t('paywall.secureNote')}</p>
        </div>
      </div>
    </div>
  );
}
