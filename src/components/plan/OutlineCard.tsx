import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { inlineComponents } from '@lib/markdownComponents';
import { StatusIndicator, type DocumentStatus } from './StatusIndicator';

export type OutlinePage = {
  page?: number;
  title?: string;
  summary?: string;
  teasers?: string[];
  cta?: string;
  details?: string;
};

const moduleColors = [
  { bg: 'from-orange-50 to-amber-50', border: 'border-orange-200', accent: '#ff6b35', badge: 'bg-orange-100 text-orange-700' },
  { bg: 'from-blue-50 to-indigo-50', border: 'border-blue-200', accent: '#3b82f6', badge: 'bg-blue-100 text-blue-700' },
  { bg: 'from-emerald-50 to-teal-50', border: 'border-emerald-200', accent: '#10b981', badge: 'bg-emerald-100 text-emerald-700' },
  { bg: 'from-purple-50 to-violet-50', border: 'border-purple-200', accent: '#8b5cf6', badge: 'bg-purple-100 text-purple-700' },
  { bg: 'from-rose-50 to-pink-50', border: 'border-rose-200', accent: '#f43f5e', badge: 'bg-rose-100 text-rose-700' },
];

interface OutlineCardProps {
  page: OutlinePage;
  index: number;
  diagnostic?: string;
  documentStatus?: DocumentStatus;
  onOpen: () => void;
}

export function OutlineCard({ page, index, diagnostic, documentStatus, onOpen }: OutlineCardProps) {
  const { t } = useTranslation('plan');
  const teasers = Array.isArray(page.teasers) ? page.teasers : [];
  const colors = moduleColors[index % moduleColors.length];
  const isClickable = documentStatus === 'completed' || documentStatus === 'failed';
  const isGenerating = documentStatus === 'generating';
  const isPending = documentStatus === 'pending';

  return (
    <div
      data-testid="outline-card"
      onClick={isClickable ? onOpen : undefined}
      className={`bg-gradient-to-br ${colors.bg} rounded-xl border ${colors.border} p-5 transition-all ${isClickable ? 'cursor-pointer hover:shadow-md hover:scale-[1.01]' : ''} ${!documentStatus || isPending ? 'opacity-80' : ''}`}
    >
      {/* Module number badge + status */}
      <div className="flex items-center justify-between mb-3">
        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>{t('card.moduleNumber', { number: page.page ?? index + 1 })}</div>
        {documentStatus && <StatusIndicator status={documentStatus} accent={colors.accent} />}
      </div>

      {/* Title */}
      <h3 data-testid="module-title" className="text-base font-semibold text-neutral-900 mb-2 leading-snug">
        <ReactMarkdown components={inlineComponents}>{page.title || 'Untitled'}</ReactMarkdown>
      </h3>

      {/* Summary */}
      {page.summary && (
        <div className="text-sm text-neutral-600 mb-3 leading-relaxed">
          <ReactMarkdown components={inlineComponents}>{page.summary}</ReactMarkdown>
        </div>
      )}

      {/* Teasers */}
      {teasers.length > 0 && (
        <ul className="space-y-2 mb-3">
          {teasers.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-neutral-700">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke={colors.accent} strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>
                <ReactMarkdown components={inlineComponents}>{item}</ReactMarkdown>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* CTA or status message */}
      {isGenerating ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 bg-white/50 text-sm text-neutral-600">
          <div className="h-3.5 w-3.5 spinner" style={{ borderTopColor: colors.accent }} />
          {t('card.generatingHandbook')}
        </div>
      ) : documentStatus === 'completed' ? (
        <div className="mt-3 rounded-lg px-3 py-2 text-xs font-medium" style={{ background: `${colors.accent}15`, color: colors.accent }}>
          {t('card.clickToRead')}
        </div>
      ) : documentStatus === 'failed' ? (
        <div className="mt-3 rounded-lg px-3 py-2 text-xs font-medium bg-red-50 text-red-600">{t('card.failedRetry')}</div>
      ) : isPending ? (
        <div className="mt-3 rounded-lg px-3 py-2 text-xs text-neutral-400 bg-white/50">{t('card.waiting')}</div>
      ) : page.cta ? (
        <div className="mt-3 rounded-lg px-3 py-2 text-xs font-medium" style={{ background: `${colors.accent}15`, color: colors.accent }}>
          <ReactMarkdown components={inlineComponents}>{page.cta}</ReactMarkdown>
        </div>
      ) : null}

      {/* Details/Diagnostic */}
      {(page.details || diagnostic) && !documentStatus && (
        <div className="mt-3 pt-3 border-t border-white/50 text-xs text-neutral-500">
          <ReactMarkdown components={inlineComponents}>{page.details || diagnostic || ''}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
