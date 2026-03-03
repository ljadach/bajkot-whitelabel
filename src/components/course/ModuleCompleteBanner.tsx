import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { type OutlinePage } from '../plan/OutlineCard';

interface ModuleCompleteBannerProps {
  courseDocumentId: Id<'courseDocuments'> | undefined;
  moduleTitle: string;
  selectedPageIndex: number;
  outline: OutlinePage[] | null;
  onNavigate: (path: string) => void;
  variant: 'standard' | 'warm';
}

export function ModuleCompleteBanner({ courseDocumentId, moduleTitle, selectedPageIndex, outline, onNavigate, variant }: ModuleCompleteBannerProps) {
  const { t } = useTranslation('course');
  const isComplete = useQuery(api.progress.isModuleComplete, courseDocumentId ? { courseDocumentId } : 'skip');
  const [showConfetti, setShowConfetti] = useState(false);
  const hasAnimated = useRef<string | null>(null);

  // Reset when navigating to a different module
  useEffect(() => {
    hasAnimated.current = null;
  }, [courseDocumentId]);

  useEffect(() => {
    if (isComplete && hasAnimated.current !== courseDocumentId) {
      hasAnimated.current = courseDocumentId ?? null;
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [isComplete, courseDocumentId]);

  if (!isComplete) return null;

  const hasNext = outline !== null && selectedPageIndex + 1 < outline.length;
  const isLast = !hasNext;

  return (
    <div className={`module-complete-banner module-complete-banner--${variant}`}>
      {/* Confetti burst — 10 mixed-shape particles */}
      {showConfetti && (
        <div className="mc-confetti" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={`mc-confetti__p mc-confetti__p--${i}`} />
          ))}
        </div>
      )}

      {/* Radial glow behind icon */}
      <div className="module-complete-banner__glow" aria-hidden="true" />

      {/* Trophy icon */}
      <div className="module-complete-banner__icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 20h10c0-.76-.85-1.25-2.03-1.79C14.47 17.98 14 17.55 14 17v-2.34" />
          <path d="M18 2H6v7a6 6 0 1012 0V2z" />
        </svg>
      </div>

      {/* Heading */}
      <h3 className="module-complete-banner__title">{t('moduleComplete.done', { title: moduleTitle })}</h3>

      {/* Body */}
      <p className="module-complete-banner__body">{isLast ? t('moduleComplete.allDone') : t('moduleComplete.ready')}</p>

      {/* Actions */}
      <div className="module-complete-banner__actions">
        {isLast ? (
          <button onClick={() => onNavigate('/plan')} className="module-complete-banner__cta">
            {t('moduleComplete.back')}
          </button>
        ) : (
          <>
            <button onClick={() => onNavigate(`/plan/${selectedPageIndex + 1}`)} className="module-complete-banner__cta">
              {t('moduleComplete.next')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
            <button onClick={() => onNavigate('/plan')} className={`module-complete-banner__ghost ${variant === 'warm' ? 'module-complete-banner__ghost--warm' : ''}`}>
              {t('moduleComplete.back')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
