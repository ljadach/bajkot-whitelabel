import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { proseComponents } from '@lib/markdownComponents';

interface QuickTipWidgetProps {
  tip?: {
    hook?: string;
    content: string;
    generatedAt: number;
    searchSources?: string[];
  };
  isGenerating: boolean;
  onDismiss: () => void;
}

export function QuickTipWidget({ tip, isGenerating, onDismiss }: QuickTipWidgetProps) {
  const { t } = useTranslation('plan');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Loading state
  if (isGenerating) {
    return (
      <div className="mb-8 rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
            <div className="w-5 h-5 spinner" style={{ borderTopColor: '#ff6b35' }} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">{t('quickTip.loading.title')}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{t('quickTip.loading.subtitle')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tip) return null;

  // Extract hook or generate from content
  const hook =
    tip.hook ||
    tip.content
      .split('\n')[0]
      ?.replace(/^[#*]+\s*/, '')
      .slice(0, 100) ||
    'A personalized insight for you';

  return (
    <>
      {/* Teaser Card */}
      <div className="mb-8">
        <div onClick={() => setIsModalOpen(true)} className="quick-tip-teaser rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium" style={{ color: '#cc4a1a' }}>
                  {t('quickTip.badge')}
                </span>
                <span className="text-xs text-neutral-400">•</span>
                <span className="text-xs text-neutral-500">{t('quickTip.subBadge')}</span>
              </div>
              <h3 className="text-base font-medium text-neutral-900 leading-snug pr-6">{hook}</h3>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-sm font-medium" style={{ color: '#ff6b35' }}>
                  {t('quickTip.readMore')}
                </span>
                <svg className="w-4 h-4" style={{ color: '#ff6b35' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="flex-shrink-0 p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
              title="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setIsModalOpen(false)}>
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-start gap-4 px-6 py-5 border-b border-neutral-100">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium" style={{ color: '#cc4a1a' }}>
                  {t('quickTip.modalTitle')}
                </span>
                <h2 className="text-lg font-semibold text-neutral-900 mt-1 leading-snug">{hook}</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="flex-shrink-0 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-160px)] px-6 py-6">
              <div className="quick-tip-prose">
                <ReactMarkdown components={proseComponents}>{tip.content}</ReactMarkdown>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-neutral-100 bg-neutral-50">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' }}>
                {t('quickTip.gotIt')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
