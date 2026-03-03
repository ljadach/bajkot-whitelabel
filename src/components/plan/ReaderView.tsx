import { useState } from 'react';
import { Id } from '../../../convex/_generated/dataModel';
import { useChapterProgress } from '../../hooks/useChapterProgress';
import { ChapterNav } from '../course/ChapterNav';
import { HandbookContent } from '../course/HandbookContent';
import { LemParchmentPanel } from '../course/LemParchmentPanel';
import { ModuleCompleteBanner } from '../course/ModuleCompleteBanner';
import { type DocumentStatus } from './StatusIndicator';
import { type OutlinePage } from './OutlineCard';

type ChapterNumber = 1 | 2 | 3;

interface ReaderViewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- handbook shape varies per document
  currentDocument: { _id: Id<'courseDocuments'>; pageTitle: string; status: DocumentStatus; handbook?: any; error?: string } | null;
  outline: OutlinePage[] | null;
  selectedPageIndex: number;
  selectedChapter: ChapterNumber;
  chapters: { number: number; title: string }[];
  documents: { _id: Id<'courseDocuments'>; pageIndex: number; status: DocumentStatus }[] | undefined;
  getChapterData: (chapterNum: ChapterNumber) => { title: string; content: string } | null;
  onBackToPlan: () => void;
  onSelectChapter: (n: number) => void;
  onNavigate: (path: string) => void;
}

export function ReaderView({ currentDocument, outline, selectedPageIndex, selectedChapter, chapters, documents: _documents, getChapterData, onBackToPlan, onSelectChapter, onNavigate }: ReaderViewProps) {
  const { status, timeSpentMinutes, isCompleted, completeChapter, isLoading } = useChapterProgress({
    courseDocumentId: currentDocument?._id,
    chapterNumber: selectedChapter,
    enabled: currentDocument?.status === 'completed',
  });

  const [isCompleting, setIsCompleting] = useState(false);

  const handleCompleteChapter = async () => {
    if (isCompleting || isCompleted) return;
    setIsCompleting(true);
    try {
      await completeChapter();
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div data-testid="reader-view" className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      {/* Back button */}
      <button data-testid="back-to-plan" onClick={onBackToPlan} className="mb-4 flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-700 transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Plan
      </button>

      {/* Header with progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Module {selectedPageIndex + 1}</div>
            <h2 data-testid="reader-module-title" className="text-xl font-semibold text-neutral-900">
              {currentDocument?.pageTitle || outline?.[selectedPageIndex]?.title || `Module ${selectedPageIndex + 1}`}
            </h2>
          </div>
          {/* Chapter progress indicator */}
          {currentDocument?.status === 'completed' && !isLoading && (
            <div className="flex items-center gap-3">
              {timeSpentMinutes > 0 && <span className="text-xs text-neutral-400">{timeSpentMinutes}m spent</span>}
              {isCompleted ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Completed
                </span>
              ) : status === 'in_progress' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  In Progress
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <LemParchmentPanel
          moduleNumber={selectedPageIndex + 1}
          moduleTitle={currentDocument?.pageTitle || outline?.[selectedPageIndex]?.title || `Module ${selectedPageIndex + 1}`}
          chapterNumber={selectedChapter}
          chapterTitle={getChapterData(selectedChapter)?.title || chapters[selectedChapter - 1]?.title}
          summary={outline?.[selectedPageIndex]?.summary}
        />
      </div>

      {/* Chapter navigation + content */}
      <div className="flex gap-6">
        <ChapterNav chapters={chapters} selected={selectedChapter} onSelect={onSelectChapter} />
        <div className="min-w-0 flex-1">
          <HandbookContent chapter={getChapterData(selectedChapter)} status={currentDocument?.status || 'pending'} error={currentDocument?.error} courseDocumentId={currentDocument?._id} chapterNumber={selectedChapter} />

          {/* Complete Chapter Button */}
          {currentDocument?.status === 'completed' && !isLoading && !isCompleted && (
            <div className="mt-8 pt-6 border-t border-neutral-100">
              <button
                onClick={() => void handleCompleteChapter()}
                disabled={isCompleting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
              >
                {isCompleting ? (
                  <>
                    <div className="w-4 h-4 spinner" style={{ borderTopColor: 'white' }} />
                    Marking complete...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mark Chapter as Complete
                  </>
                )}
              </button>
              <p className="mt-2 text-xs text-neutral-500">Mark this chapter as complete when you've finished reading and practicing.</p>
            </div>
          )}

          {/* Already completed message */}
          {currentDocument?.status === 'completed' && isCompleted && (
            <div className="mt-8 pt-6 border-t border-neutral-100">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-700 text-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                You've completed this chapter!
              </div>
            </div>
          )}

          {/* Module completion banner */}
          <ModuleCompleteBanner
            courseDocumentId={currentDocument?._id}
            moduleTitle={currentDocument?.pageTitle || outline?.[selectedPageIndex]?.title || `Module ${selectedPageIndex + 1}`}
            selectedPageIndex={selectedPageIndex}
            outline={outline}
            onNavigate={onNavigate}
            variant="standard"
          />
        </div>
      </div>
    </div>
  );
}
