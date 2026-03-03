import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { useChapterProgress } from '../../hooks/useChapterProgress';
import { useLearnerArtifacts } from '../../hooks/useLearnerArtifacts';
import { HandbookContent } from './HandbookContent';
import { FeynmanOracle, ChapterProbes } from './LemParchmentPanel';
import { GlossatorMargin, WorkbenchTabs } from './LearningTools';
import { ModuleCompleteBanner } from './ModuleCompleteBanner';
import { type DocumentStatus } from '../plan/StatusIndicator';
import { type OutlinePage } from '../plan/OutlineCard';
import { type ToolPreferences } from '../../hooks/useToolPreferences';

const BASE_CHAPTERS = [1, 2, 3] as const;

interface ScrollReaderViewProps {
  currentDocument: {
    _id: Id<'courseDocuments'>;
    pageTitle: string;
    status: DocumentStatus;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- handbook shape varies per document
    handbook?: any;
    error?: string;
  } | null;
  outline: OutlinePage[] | null;
  selectedPageIndex: number;
  onBackToPlan: () => void;
  onNavigate: (path: string) => void;
  profileXml?: string;
  toolPreferences?: ToolPreferences;
}

function ChapterSection({
  chapterNumber,
  chapterData,
  courseDocumentId,
  status,
  error,
  sectionRef,
  showChapterProbes = true,
}: {
  chapterNumber: number;
  chapterData: { title: string; content: string } | null;
  courseDocumentId?: Id<'courseDocuments'>;
  status: DocumentStatus;
  error?: string;
  sectionRef: (el: HTMLElement | null) => void;
  showChapterProbes?: boolean;
}) {
  const { t } = useTranslation('course');
  const { isCompleted, completeChapter } = useChapterProgress({
    courseDocumentId,
    chapterNumber,
    enabled: status === 'completed',
  });

  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    if (isCompleting || isCompleted) return;
    setIsCompleting(true);
    try {
      await completeChapter();
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <section ref={sectionRef} data-chapter={chapterNumber} className="scroll-reader-chapter">
      {/* Chapter heading */}
      <div className="scroll-reader-chapter-head">
        <span className="scroll-reader-chapter-number">{t('scrollReader.chapter', { number: chapterNumber })}</span>
        {chapterData?.title && <h2 className="scroll-reader-chapter-title">{chapterData.title}</h2>}
      </div>

      {/* Content */}
      <div className="scroll-reader-prose">
        <HandbookContent chapter={chapterData} status={status} error={error} courseDocumentId={courseDocumentId} chapterNumber={chapterNumber} inlineVideos />
      </div>

      {/* Chapter probes -- contextual thinking prompts after content */}
      {status === 'completed' && showChapterProbes && <ChapterProbes chapterNumber={chapterNumber} />}

      {/* Chapter completion -- warm bookmark style */}
      {status === 'completed' && !isCompleted && (
        <div className="mt-8 flex justify-center">
          <button onClick={() => void handleComplete()} disabled={isCompleting} className="scroll-reader-completion-btn">
            {isCompleting ? (
              <>
                <div className="w-4 h-4 spinner" style={{ borderTopColor: 'rgba(250,248,245,0.6)' }} />
                {t('scrollReader.markingComplete')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('scrollReader.markComplete')}
              </>
            )}
          </button>
        </div>
      )}
      {status === 'completed' && isCompleted && (
        <div className="mt-6 flex justify-center">
          <span className="scroll-reader-completion-badge">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {t('scrollReader.completed')}
          </span>
        </div>
      )}
    </section>
  );
}

function ExplorationChapterSection({
  chapterNumber,
  phase,
  title,
  content,
  probeText,
  courseDocumentId,
  sectionRef,
}: {
  chapterNumber: number;
  phase: string;
  title: string;
  content: string;
  probeText: string;
  courseDocumentId?: Id<'courseDocuments'>;
  sectionRef: (el: HTMLElement | null) => void;
}) {
  const { t } = useTranslation('course');
  const isComplete = phase === 'complete';
  const { isCompleted, completeChapter } = useChapterProgress({
    courseDocumentId,
    chapterNumber,
    enabled: isComplete,
  });
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    if (isCompleting || isCompleted) return;
    setIsCompleting(true);
    try {
      await completeChapter();
    } finally {
      setIsCompleting(false);
    }
  };

  const progressPercent = phase === 'sketch' ? 33 : phase === 'expanded' ? 66 : 100;

  return (
    <section ref={sectionRef} data-chapter={chapterNumber} className="scroll-reader-chapter scroll-reader-chapter--exploration">
      <div className="scroll-reader-exploration-badge">
        <span className="scroll-reader-exploration-badge__label">{t('exploration.label')}</span>
        <span className={`scroll-reader-exploration-phase scroll-reader-exploration-phase--${phase}`}>{t(`exploration.phase.${phase}`)}</span>
      </div>

      <div className="scroll-reader-chapter-head">
        <span className="scroll-reader-chapter-number">{t('scrollReader.chapter', { number: chapterNumber })}</span>
        <h2 className="scroll-reader-chapter-title">{title}</h2>
      </div>

      <div className="scroll-reader-exploration-origin">{t('exploration.triggeredBy', { probe: probeText })}</div>

      {!isComplete && (
        <div className="scroll-reader-exploration-progress">
          <div className="scroll-reader-exploration-progress__bar" style={{ width: `${progressPercent}%` }} />
        </div>
      )}

      <div className="scroll-reader-prose">
        <HandbookContent chapter={{ title, content }} status="completed" />
      </div>

      {isComplete && !isCompleted && (
        <div className="mt-8 flex justify-center">
          <button onClick={() => void handleComplete()} disabled={isCompleting} className="scroll-reader-completion-btn">
            {isCompleting ? (
              <>
                <div className="w-4 h-4 spinner" style={{ borderTopColor: 'rgba(250,248,245,0.6)' }} />
                {t('scrollReader.markingComplete')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('scrollReader.markComplete')}
              </>
            )}
          </button>
        </div>
      )}
      {isComplete && isCompleted && (
        <div className="mt-6 flex justify-center">
          <span className="scroll-reader-completion-badge">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {t('scrollReader.completed')}
          </span>
        </div>
      )}
    </section>
  );
}

export function ScrollReaderView({ currentDocument, outline, selectedPageIndex, onBackToPlan, onNavigate, profileXml, toolPreferences }: ScrollReaderViewProps) {
  const { t } = useTranslation('course');
  const [activeChapter, setActiveChapter] = useState<number>(1);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [workbenchCollapsed, setWorkbenchCollapsed] = useState(false);
  const [workbenchHeight, setWorkbenchHeight] = useState(320);
  const [toolsVisible, setToolsVisible] = useState(true);
  const chapterRefs = useRef<Map<number, HTMLElement>>(new Map());

  const { artifacts, saveArtifact, getArtifactContent, getArtifact } = useLearnerArtifacts({
    courseDocumentId: currentDocument?._id,
  });

  const isCompleted = currentDocument?.status === 'completed';

  // Extract exploration chapters from artifacts
  const explorationChapters = useMemo(() => {
    if (!artifacts) return [];
    return artifacts
      .filter((a) => a.toolId === 'exploration' && a.chapterNumber >= 4)
      .sort((a, b) => a.chapterNumber - b.chapterNumber)
      .map((a) => {
        try {
          const parsed = JSON.parse(a.content) as { phase: string; title: string; content: string; probeText: string };
          return { chapterNumber: a.chapterNumber, ...parsed, updatedAt: a.updatedAt };
        } catch {
          return null;
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [artifacts]);

  const allChapterNumbers = useMemo(() => {
    const explorationNums = explorationChapters.map((c) => c.chapterNumber);
    return [...BASE_CHAPTERS, ...explorationNums];
  }, [explorationChapters]);

  // Exploration chapter generation
  const [generatingChapter, setGeneratingChapter] = useState<number | null>(null);
  const startExploration = useAction(api.instrumentAi.startExplorationChapter);

  const handleGenerateChapter = useCallback(
    async (probeText: string) => {
      if (!currentDocument?._id || generatingChapter !== null) return;
      try {
        const result = await startExploration({
          courseDocumentId: currentDocument._id,
          probeText,
          profileXml,
        });
        if (result.success) {
          setGeneratingChapter(result.chapterNumber);
        }
      } catch {
        // generation failed
      }
    },
    [currentDocument?._id, generatingChapter, startExploration, profileXml]
  );

  // Clear generating state when chapter completes
  useEffect(() => {
    if (generatingChapter === null) return;
    const chapter = explorationChapters.find((c) => c.chapterNumber === generatingChapter);
    if (chapter?.phase === 'complete') {
      setGeneratingChapter(null);
    }
  }, [generatingChapter, explorationChapters]);

  const getChapterData = useCallback(
    (chapterNum: number) => {
      if (!currentDocument?.handbook) return null;
      const key = `chapter${chapterNum}` as const;
      return currentDocument.handbook[key] ?? null;
    },
    [currentDocument]
  );

  const chapters = useMemo(() => {
    return BASE_CHAPTERS.map((n) => {
      const fallback = t('scrollReader.chapter', { number: n });
      const data = getChapterData(n);
      return { number: n, title: data?.title || fallback };
    });
  }, [getChapterData, t]);

  // Active chapter content for workbench (base or exploration)
  const activeChapterContent = useMemo(() => {
    if (activeChapter >= 4) {
      const exploration = explorationChapters.find((c) => c.chapterNumber === activeChapter);
      return exploration?.content || '';
    }
    const data = getChapterData(activeChapter);
    return data?.content || '';
  }, [activeChapter, getChapterData, explorationChapters]);

  // Build initial notes for GlossatorMargin from artifacts
  const glossatorNotes = useMemo(() => {
    const notes: Record<number, string[]> = {};
    for (const ch of BASE_CHAPTERS) {
      const content = getArtifactContent(ch, 'glossator');
      if (content) {
        try {
          const parsed: unknown = JSON.parse(content);
          if (Array.isArray(parsed)) {
            notes[ch] = parsed as string[];
          }
        } catch {
          // ignore
        }
      }
    }
    return notes;
  }, [getArtifactContent]);

  // Scroll to top when entering or switching pages
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedPageIndex]);

  // Track which chapter is in view via IntersectionObserver
  const [refsReady, setRefsReady] = useState(0);

  useEffect(() => {
    if (refsReady < allChapterNumbers.length) return;
    const observers: IntersectionObserver[] = [];

    chapterRefs.current.forEach((el, chapterNum) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveChapter(chapterNum);
          }
        },
        { rootMargin: '-10% 0px -70% 0px', threshold: 0 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [refsReady, allChapterNumbers.length]);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setScrollProgress(Math.min(1, scrollTop / docHeight));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const setChapterRef = useCallback(
    (chapterNum: number) => (el: HTMLElement | null) => {
      if (el) {
        chapterRefs.current.set(chapterNum, el);
        setRefsReady((prev) => Math.max(prev, chapterRefs.current.size));
      } else {
        chapterRefs.current.delete(chapterNum);
      }
    },
    []
  );

  const scrollToChapter = (chapterNum: number) => {
    const el = chapterRefs.current.get(chapterNum);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const moduleTitle = currentDocument?.pageTitle || outline?.[selectedPageIndex]?.title || t('scrollReader.module', { number: selectedPageIndex + 1 });
  const summary = outline?.[selectedPageIndex]?.summary;

  // Compute effective bottom padding when workbench is visible
  const showWorkbench = isCompleted && toolPreferences?.workbenchTabs && toolsVisible;
  const bottomPadding = showWorkbench ? (workbenchCollapsed ? 60 : workbenchHeight + 20) : undefined;

  return (
    <div className={`scroll-reader ${isCompleted ? 'scroll-reader--has-floating-bar' : ''}`} data-testid="reader-view" style={isCompleted ? { paddingBottom: bottomPadding } : undefined}>
      {/* Floating progress bar */}
      <div className="scroll-reader-progress">
        <div className="scroll-reader-progress-bar" style={{ width: `${scrollProgress * 100}%` }} />
      </div>

      {/* Floating chapter indicator */}
      <div className="scroll-reader-chapter-indicator">
        {allChapterNumbers.map((n) => {
          const isExploration = n >= 4;
          const dotTitle = isExploration ? explorationChapters.find((c) => c.chapterNumber === n)?.title : chapters[n - 1]?.title;
          return (
            <button key={n} onClick={() => scrollToChapter(n)} className={`scroll-reader-chapter-dot ${isExploration ? 'scroll-reader-chapter-dot--exploration' : ''} ${activeChapter === n ? 'active' : ''}`} title={dotTitle}>
              {n}
            </button>
          );
        })}
      </div>

      {/* Feynman Oracle -- floating thinking companion */}
      {toolPreferences?.feynmanOracle && <FeynmanOracle activeChapter={activeChapter} chapterContent={activeChapterContent} profileXml={profileXml} onSave={saveArtifact} getArtifactContent={getArtifactContent} />}

      {/* Header -- back + module title */}
      <div className="scroll-reader-header">
        <div className="scroll-reader-header-row">
          <button onClick={onBackToPlan} className="scroll-reader-back">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('scrollReader.backToPlan')}
          </button>
        </div>
        <div className="scroll-reader-module-label">{t('scrollReader.module', { number: selectedPageIndex + 1 })}</div>
        <h1 className="scroll-reader-module-title">{moduleTitle}</h1>
        {summary?.trim() && <p className="scroll-reader-signal">{t('lemParchment.signal', { summary: summary.trim() })}</p>}
      </div>

      {/* Main body: content + glossator margin */}
      <div className="scroll-reader-body">
        <div className="scroll-reader-main">
          {/* Base chapters */}
          {BASE_CHAPTERS.map((chapterNum) => (
            <ChapterSection
              key={chapterNum}
              chapterNumber={chapterNum}
              chapterData={getChapterData(chapterNum)}
              courseDocumentId={currentDocument?._id}
              status={currentDocument?.status || 'pending'}
              error={currentDocument?.error}
              sectionRef={setChapterRef(chapterNum)}
              showChapterProbes={toolPreferences?.chapterProbes ?? false}
            />
          ))}

          {/* Module completion banner */}
          <ModuleCompleteBanner courseDocumentId={currentDocument?._id} moduleTitle={moduleTitle} selectedPageIndex={selectedPageIndex} outline={outline} onNavigate={onNavigate} variant="warm" />

          {/* Exploration chapters */}
          {explorationChapters.map((ch) => (
            <ExplorationChapterSection key={ch.chapterNumber} chapterNumber={ch.chapterNumber} phase={ch.phase} title={ch.title} content={ch.content} probeText={ch.probeText} courseDocumentId={currentDocument?._id} sectionRef={setChapterRef(ch.chapterNumber)} />
          ))}
        </div>

        {/* Right margin notes panel */}
        {isCompleted && toolPreferences?.glossatorMargin && <GlossatorMargin key={currentDocument?._id} activeChapter={activeChapter} onSave={(chapterNumber, content) => saveArtifact(chapterNumber, 'glossator', content)} initialNotes={glossatorNotes} />}
      </div>

      {/* Floating workbench tabs */}
      {showWorkbench && (
        <WorkbenchTabs
          courseDocumentId={currentDocument?._id}
          activeChapter={activeChapter}
          chapterContent={activeChapterContent}
          profileXml={profileXml}
          onSave={saveArtifact}
          getArtifactContent={getArtifactContent}
          getArtifact={getArtifact}
          collapsed={workbenchCollapsed}
          onToggleCollapse={() => setWorkbenchCollapsed(!workbenchCollapsed)}
          onGenerateChapter={(probe) => void handleGenerateChapter(probe)}
          explorationCount={explorationChapters.length}
          generatingChapter={generatingChapter}
          onHeightChange={setWorkbenchHeight}
        />
      )}

      {/* FAB — Show/Hide Learning Tools */}
      {isCompleted && toolPreferences?.workbenchTabs && (
        <button type="button" className={`wb-fab ${toolsVisible ? 'wb-fab--active' : ''}`} style={toolsVisible && !workbenchCollapsed ? { bottom: workbenchHeight + 12 } : undefined} onClick={() => setToolsVisible((v) => !v)} aria-label={t('scrollReader.workbenchTitle')}>
          {toolsVisible ? (
            <svg className="wb-fab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="wb-fab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
              />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
