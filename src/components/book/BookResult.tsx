import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useAction, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { captureOrderTokenFromUrl } from '../../hooks/useOrderToken';
import { useResolvedR2Url } from '../../hooks/useResolvedR2Url';
import { BrandFooter, BrandHeader } from '../BrandChrome';
import { BookSuccessScreen, BookPreviewScreen } from './BookResultScreens';

/** How long to wait for the Stripe webhook after a successful Checkout redirect. */
const PAYMENT_CONFIRM_TIMEOUT_MS = 30_000;

/**
 * Result page — /bajka/:orderId/gotowa. Unpaid: preview + paywall (Stripe
 * Checkout). Paid: the book and the download. Stripe returns here with
 * `?checkout=success` before its webhook has necessarily landed, so for a
 * short while we show "confirming payment" instead of the paywall again.
 */
export function BookResult() {
  const { t } = useTranslation('book');
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const accessToken = captureOrderTokenFromUrl(orderId);
  const args =
    orderId && accessToken ? { orderId: orderId as Id<'bookOrders'>, accessToken } : null;

  const data = useQuery(api.bookPipeline.getLandingDownloadUrl, args ?? 'skip');
  const fullDownloadUrl = useResolvedR2Url({
    orderId: orderId as Id<'bookOrders'> | undefined,
    kind: 'full',
    r2Key: data?.r2FullKey ?? null,
    directUrl: data?.url ?? null,
    accessToken,
  });
  const unpaid = data?.hasPdf === true && data?.paid === false;
  const preview = useQuery(api.bookPipeline.getLandingOrderPreview, args && unpaid ? args : 'skip');
  const createCheckoutSession = useAction(api.stripe.createLandingCheckoutSession);

  const returnedFromCheckout = searchParams.get('checkout') === 'success';
  const [confirmTimedOut, setConfirmTimedOut] = useState(false);
  useEffect(() => {
    if (!returnedFromCheckout || !unpaid) return;
    const timer = setTimeout(() => setConfirmTimedOut(true), PAYMENT_CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [returnedFromCheckout, unpaid]);

  let content;
  if (!args) {
    content = (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <p className="text-sm text-gray-500">{t('progress.notFound')}</p>
      </div>
    );
  } else if (data === undefined) {
    content = (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 spinner" />
      </div>
    );
  } else if (unpaid && returnedFromCheckout && !confirmTimedOut) {
    content = (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-8 h-8 spinner" />
        <p className="text-lg font-bold text-primary-900">{t('result.confirmingPayment')}</p>
        <p className="text-sm text-gray-500 max-w-sm">{t('result.confirmingPaymentHint')}</p>
      </div>
    );
  } else if (unpaid) {
    content = (
      <BookPreviewScreen
        preview={preview}
        bookOrderId={args.orderId}
        accessToken={accessToken}
        onUnlock={async (format) => {
          const session = await createCheckoutSession({
            bookOrderId: args.orderId,
            accessToken: args.accessToken,
            format,
          });
          if (typeof window !== 'undefined') window.location.assign(session.url);
        }}
      />
    );
  } else {
    content = (
      <BookSuccessScreen
        downloadUrl={fullDownloadUrl}
        childName={data?.childName ?? null}
        bookTitle={data?.bookTitle ?? null}
        bookOrderId={args.orderId}
        format={data?.format ?? 'pdf'}
        shippingAddress={data?.shippingAddress ?? null}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <BrandHeader />
      <div className="flex-1">{content}</div>
      <BrandFooter />
    </div>
  );
}
