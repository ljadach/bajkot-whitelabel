import { useParams, Link } from 'react-router';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

export function BookResult() {
  const { orderId } = useParams<{ orderId: string }>();

  const downloadUrl = useQuery(
    api.bookPipeline.getDownloadUrl,
    orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  );

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Order not found</p>
      </div>
    );
  }

  return (
    <BookSuccessScreen
      downloadUrl={downloadUrl ?? null}
      printHref={`/book/${orderId}/print`}
      upsellTo="/book/order"
    />
  );
}

interface BookSuccessScreenProps {
  downloadUrl: string | null;
  /** Optional internal link to printer-friendly version. Hidden when omitted. */
  printHref?: string;
  /** Where the upsell CTA should point (auth: order page, landing: home). */
  upsellTo: string;
}

/**
 * Shared success screen rendered by both auth and landing result pages.
 * Auth flow shows a "print version" link, landing does not.
 */
export function BookSuccessScreen({ downloadUrl, printHref, upsellTo }: BookSuccessScreenProps) {
  const { t } = useTranslation('book');
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="text-7xl md:text-8xl">🎉</div>

        <div>
          <span className="text-magic-500 font-bold uppercase tracking-widest text-sm mb-2 block">
            {t('result.kicker')}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-calm-900 mb-3">
            {t('result.headingFallback')}
          </h1>
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
                className="w-full inline-flex items-center justify-center gap-2 bg-magic-500 hover:bg-magic-600 text-white font-extrabold px-8 py-4 rounded-2xl text-lg shadow-xl shadow-magic-500/30 transition transform hover:-translate-y-0.5"
              >
                <i className="fa-solid fa-download" />
                {t('result.download')}
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
