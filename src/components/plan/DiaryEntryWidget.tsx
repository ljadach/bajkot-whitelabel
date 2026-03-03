import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { proseComponents } from '@lib/markdownComponents';

export const DIARY_PEN_ICON_PATH =
  'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10';

interface DiaryEntryWidgetProps {
  diary?: {
    title: string;
    content: string;
    generatedAt: number;
  };
  isGenerating: boolean;
  onDismiss: () => void;
}

export function DiaryEntryWidget({ diary, isGenerating, onDismiss }: DiaryEntryWidgetProps) {
  const { t } = useTranslation('plan');
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isGenerating) {
    return (
      <div className="mb-8 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-violet-50 p-5">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center">
            <div className="w-5 h-5 spinner" style={{ borderTopColor: '#8b5cf6' }} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">{t('diaryEntry.loading.title')}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{t('diaryEntry.loading.subtitle')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!diary) return null;

  return (
    <>
      {/* Teaser Card */}
      <div className="mb-8">
        <div onClick={() => setIsModalOpen(true)} className="diary-entry-teaser cursor-pointer rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-violet-50 p-5 transition-shadow hover:shadow-md">
          <div className="flex items-start gap-4">
            {/* Icon — notebook/pen */}
            <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)' }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={DIARY_PEN_ICON_PATH} />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-purple-700">{t('diaryEntry.badge')}</span>
                <span className="text-xs text-neutral-400">•</span>
                <span className="text-xs text-neutral-500">{t('diaryEntry.subBadge')}</span>
              </div>
              <h3 className="text-base font-medium text-neutral-900 leading-snug pr-6">{diary.title}</h3>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-sm font-medium text-purple-600">{t('diaryEntry.readMore')}</span>
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

      {/* Modal — blog post style */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Gradient hero bar */}
            <div className="h-2 flex-shrink-0 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #7c3aed 0%, #8b5cf6 30%, #a78bfa 60%, #c4b5fd 100%)' }} />

            {/* Close button — floating */}
            <button onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 z-10 p-2 rounded-full bg-white/90 text-neutral-400 hover:text-neutral-600 hover:bg-white shadow-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Blog header — fixed */}
            <div className="flex-shrink-0 px-8 sm:px-12 pt-8 pb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)' }}>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={DIARY_PEN_ICON_PATH} />
                  </svg>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-600">{t('diaryEntry.modalTitle')}</span>
                <span className="text-xs text-neutral-300 mx-1">|</span>
                <span className="text-xs text-neutral-400">{t('diaryEntry.dateLabel')}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 leading-tight pr-10">{diary.title}</h2>
              <div className="mt-6 border-t border-neutral-100" />
            </div>

            {/* Blog content — scrollable, takes remaining space */}
            <div className="flex-1 min-h-0 overflow-y-auto px-8 sm:px-12 pb-8">
              <div className="diary-entry-prose max-w-prose text-base leading-relaxed text-neutral-700">
                <ReactMarkdown components={proseComponents}>{diary.content}</ReactMarkdown>
              </div>
            </div>

            {/* Footer — always visible */}
            <div className="flex-shrink-0 flex items-center justify-between gap-4 px-8 sm:px-12 py-4 border-t border-neutral-100 bg-neutral-50/80 rounded-b-2xl">
              <span className="text-xs text-neutral-400 italic">{t('diaryEntry.disclaimer')}</span>
              <button onClick={() => setIsModalOpen(false)} className="flex-shrink-0 px-6 py-2.5 rounded-lg text-sm font-medium text-white shadow-sm hover:shadow-md transition-shadow" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' }}>
                {t('diaryEntry.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
