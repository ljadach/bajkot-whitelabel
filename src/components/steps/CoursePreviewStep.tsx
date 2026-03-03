import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { CoursePageCard } from '../course/CoursePageCard';
import { ChapterNav } from '../course/ChapterNav';
import { HandbookContent } from '../course/HandbookContent';
import { usePageView, useFeatureFlag } from '@lib/telemetry';

interface CoursePreviewStepProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- profile shape varies across steps
  profile: any;
}

type ViewMode = 'cockpit' | 'reader';
type ChapterNumber = 1 | 2 | 3;

export function CoursePreviewStep({ profile }: CoursePreviewStepProps) {
  const { t } = useTranslation('course');
  usePageView('course_preview');
  const videoEnhanced = useFeatureFlag('video-enhanced-lessons');
  const [viewMode, setViewMode] = useState<ViewMode>('cockpit');
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [selectedChapter, setSelectedChapter] = useState<ChapterNumber>(1);
  const [isStarting, setIsStarting] = useState(false);

  // Queries
  const documents = useQuery(api.courseDocuments.getCourseDocuments);

  // Actions
  const startGeneration = useAction(api.courseAi.startCourseGeneration);
  const regenerateHandbook = useAction(api.courseAi.regenerateHandbook);

  // Parse outline for fallback titles
  const outline = useMemo(() => {
    try {
      return JSON.parse(profile?.planOutline || '[]');
    } catch {
      return [];
    }
  }, [profile?.planOutline]);

  // Check if we need to start generation
  const shouldStartGeneration = useMemo(() => {
    if (!documents) return false; // Still loading
    if (documents.length === 0 && outline.length > 0) return true;
    return false;
  }, [documents, outline]);

  const handleStartGeneration = useCallback(async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      await startGeneration({ videoEnhanced });
    } catch (error) {
      console.error('Error starting generation:', error);
    } finally {
      setIsStarting(false);
    }
  }, [isStarting, startGeneration, videoEnhanced]);

  // Auto-start generation
  useEffect(() => {
    if (shouldStartGeneration && !isStarting) {
      void handleStartGeneration();
    }
  }, [shouldStartGeneration, isStarting, handleStartGeneration]);

  const handleRegenerate = useCallback(
    async (documentId: Id<'courseDocuments'>) => {
      try {
        await regenerateHandbook({ documentId, videoEnhanced });
      } catch (error) {
        console.error('Error regenerating handbook:', error);
      }
    },
    [regenerateHandbook, videoEnhanced]
  );

  const handleSelectPage = useCallback((index: number) => {
    setSelectedPageIndex(index);
    setSelectedChapter(1);
    setViewMode('reader');
  }, []);

  const handleBackToCockpit = useCallback(() => {
    setViewMode('cockpit');
  }, []);

  // Current document for reader view
  const currentDocument = useMemo(() => {
    if (!documents) return null;
    return documents.find((d) => d.pageIndex === selectedPageIndex) || null;
  }, [documents, selectedPageIndex]);

  // Get chapter data
  const getChapterData = useCallback(
    (chapterNum: ChapterNumber) => {
      if (!currentDocument?.handbook) return null;
      if (chapterNum === 1) return currentDocument.handbook.chapter1;
      if (chapterNum === 2) return currentDocument.handbook.chapter2;
      return currentDocument.handbook.chapter3;
    },
    [currentDocument]
  );

  // Chapter navigation data
  const chapters = useMemo(() => {
    if (!currentDocument?.handbook) {
      return [
        { number: 1, title: t('preview.chapterDefault', { number: 1 }) },
        { number: 2, title: t('preview.chapterDefault', { number: 2 }) },
        { number: 3, title: t('preview.chapterDefault', { number: 3 }) },
      ];
    }
    return [
      { number: 1, title: currentDocument.handbook.chapter1?.title || t('preview.chapterDefault', { number: 1 }) },
      { number: 2, title: currentDocument.handbook.chapter2?.title || t('preview.chapterDefault', { number: 2 }) },
      { number: 3, title: currentDocument.handbook.chapter3?.title || t('preview.chapterDefault', { number: 3 }) },
    ];
  }, [currentDocument, t]);

  // Loading state
  if (documents === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 spinner" />
          <p className="text-sm text-neutral-500">{t('preview.loading')}</p>
        </div>
      </div>
    );
  }

  // Cockpit view
  if (viewMode === 'cockpit') {
    const completedCount = documents?.filter((d) => d.status === 'completed').length ?? 0;
    const totalCount = documents?.length ?? 0;

    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 mb-1.5">{t('preview.title')}</h2>
              <p className="text-sm text-neutral-500">{t('preview.subtitle')}</p>
            </div>
            {documents && documents.length > 0 && documents.every((d) => d.status === 'completed' || d.status === 'failed') && (
              <button onClick={() => void handleStartGeneration()} disabled={isStarting} className="btn-secondary">
                {isStarting ? t('preview.starting') : t('preview.regenerateAll')}
              </button>
            )}
          </div>
        </div>

        {/* Generation progress */}
        {documents && documents.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-neutral-500 mb-2">
              <span>{t('preview.generatedCount', { completed: completedCount, total: totalCount })}</span>
              {documents.some((d) => d.status === 'generating') && (
                <span className="flex items-center gap-2 text-blue-600">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                  {t('preview.generatingStatus')}
                </span>
              )}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full bg-neutral-900 transition-all duration-500"
                style={{
                  width: `${(completedCount / totalCount) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Starting generation */}
        {isStarting && (!documents || documents.length === 0) && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="w-4 h-4 spinner" />
            <span className="text-sm text-neutral-600">{t('preview.startingGeneration')}</span>
          </div>
        )}

        {/* Page cards grid */}
        {documents && documents.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {documents.map((doc) => (
              <CoursePageCard key={doc._id} pageIndex={doc.pageIndex} title={doc.pageTitle} status={doc.status} onClick={() => handleSelectPage(doc.pageIndex)} />
            ))}
          </div>
        ) : (
          !isStarting && (
            <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center">
              <p className="text-sm text-neutral-500">{t('preview.noMaterials')}</p>
            </div>
          )
        )}
      </div>
    );
  }

  // Reader view
  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="mb-6">
        <button onClick={handleBackToCockpit} className="mb-4 flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-700 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t('preview.backToOverview')}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-2xs font-medium text-neutral-400 uppercase tracking-wider mb-1">{t('preview.pageNumber', { number: selectedPageIndex + 1 })}</div>
            <h2 className="text-xl font-semibold text-neutral-900">{currentDocument?.pageTitle || t('preview.pageNumber', { number: selectedPageIndex + 1 })}</h2>
          </div>
          <button onClick={() => currentDocument && void handleRegenerate(currentDocument._id)} disabled={!currentDocument || currentDocument.status === 'generating'} className="btn-secondary">
            {currentDocument?.status === 'generating' ? t('preview.generatingStatus') : t('preview.regenerate')}
          </button>
        </div>
      </div>

      {/* Chapter navigation + content */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <ChapterNav chapters={chapters} selected={selectedChapter} onSelect={(n) => setSelectedChapter(n as ChapterNumber)} />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <HandbookContent chapter={getChapterData(selectedChapter)} status={currentDocument?.status || 'pending'} error={currentDocument?.error} courseDocumentId={currentDocument?._id} chapterNumber={selectedChapter} />
        </div>
      </div>

      {/* Page navigation */}
      {documents && documents.length > 1 && (
        <div className="mt-8 flex items-center justify-between border-t border-neutral-100 pt-6">
          <button
            onClick={() => {
              if (selectedPageIndex > 0) {
                setSelectedPageIndex(selectedPageIndex - 1);
                setSelectedChapter(1);
              }
            }}
            disabled={selectedPageIndex === 0}
            className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('preview.previous')}
          </button>
          <span className="text-sm text-neutral-400">{t('preview.pageOf', { current: selectedPageIndex + 1, total: documents.length })}</span>
          <button
            onClick={() => {
              if (selectedPageIndex < documents.length - 1) {
                setSelectedPageIndex(selectedPageIndex + 1);
                setSelectedChapter(1);
              }
            }}
            disabled={selectedPageIndex >= documents.length - 1}
            className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('preview.next')}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
