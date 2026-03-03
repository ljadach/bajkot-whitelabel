import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router';
import { api } from '../../../convex/_generated/api';
import { Doc, Id } from '../../../convex/_generated/dataModel';
import { useAnalytics, generateProfileHash, useFeatureFlag } from '@lib/telemetry';
import { OutlineCard, QuickTipWidget, ReaderView, parseJsonArray, parseFullPlan, buildDiagnostics, type OutlinePage, type DocumentStatus } from '../plan';
import { ScrollReaderView } from '../course/ScrollReaderView';
import { LANGUAGES, type SupportedLanguage } from '@/locales';

interface PlanStepProps {
  profile: Doc<'userProfiles'>;
}

type PlaybookActionRef = Parameters<typeof useAction>[0];
type ApiWithPlaybook = typeof api & {
  ai: typeof api.ai & { generatePlaybook: PlaybookActionRef };
};

type ChapterNumber = 1 | 2 | 3;

export function PlanStep({ profile }: PlanStepProps) {
  const { t, i18n } = useTranslation('plan');
  const [outline, setOutline] = useState<OutlinePage[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateFailed, setGenerateFailed] = useState(false);
  const [isStartingCourse, setIsStartingCourse] = useState(false);
  const [isGeneratingTip, setIsGeneratingTip] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);

  // URL-driven reader view state
  const params = useParams();
  const navigate = useNavigate();
  const segments = params['*']?.split('/').filter(Boolean) ?? [];
  const rawPageIndex = segments[0];
  const rawChapter = segments[1];
  const parsedPageIndex = rawPageIndex !== undefined ? Number(rawPageIndex) : NaN;
  const parsedChapter = rawChapter !== undefined ? Number(rawChapter) : NaN;
  const viewMode: 'plan' | 'reader' = !isNaN(parsedPageIndex) ? 'reader' : 'plan';
  const selectedPageIndex = !isNaN(parsedPageIndex) ? parsedPageIndex : 0;
  const selectedChapter: ChapterNumber = ([1, 2, 3] as const).includes(parsedChapter as ChapterNumber) ? (parsedChapter as ChapterNumber) : 1;

  // Get full language name for LLM (e.g., 'en' -> 'English')
  const currentLangCode = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;
  const language = LANGUAGES[currentLangCode]?.name || 'English';

  const { track, getSessionId } = useAnalytics();
  const videoEnhanced = useFeatureFlag('video-enhanced-lessons');

  const apiWithPlaybook = api as ApiWithPlaybook;
  const generatePlaybook = useAction(apiWithPlaybook.ai.generatePlaybook);
  const generateQuickTip = useAction(api.quickTipAi.generateQuickTip);
  const updateProfile = useMutation(api.profiles.createOrUpdateProfile);

  // Course documents
  const documents = useQuery(api.courseDocuments.getCourseDocuments);
  const startGeneration = useAction(api.courseAi.startCourseGeneration);

  const storedOutline = useMemo(() => parseJsonArray(profile?.planOutline), [profile?.planOutline]);
  const fullPlan = useMemo(() => parseFullPlan(profile?.planFull), [profile?.planFull]);
  const diagnosticsByPage = useMemo(() => buildDiagnostics(fullPlan), [fullPlan]);

  // Validate URL params — redirect to /plan if pageIndex is out of range
  useEffect(() => {
    if (viewMode !== 'reader' || !outline) return;
    if (selectedPageIndex < 0 || selectedPageIndex >= outline.length || !Number.isInteger(parsedPageIndex)) {
      void navigate('/plan', { replace: true });
    }
  }, [viewMode, outline, selectedPageIndex, parsedPageIndex, navigate]);

  // Get document status for each page
  const documentsByPage = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- handbook shape varies per document
    if (!documents) return new Map<number, { status: DocumentStatus; _id: Id<'courseDocuments'>; pageTitle: string; handbook?: any; error?: string }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- handbook shape varies per document
    const map = new Map<number, { status: DocumentStatus; _id: Id<'courseDocuments'>; pageTitle: string; handbook?: any; error?: string }>();
    documents.forEach((doc) => map.set(doc.pageIndex, doc));
    return map;
  }, [documents]);

  // Check if we should auto-start generation
  const shouldStartGeneration = useMemo(() => {
    if (!documents) return false;
    if (documents.length === 0 && outline && outline.length > 0) return true;
    return false;
  }, [documents, outline]);

  const handleGenerate = useCallback(
    async (regenerated: boolean) => {
      if (isGenerating) return;
      setIsGenerating(true);
      try {
        const result = await generatePlaybook({
          profileXml: typeof profile?.profileXml === 'string' ? profile.profileXml : '',
          assessmentReport: profile.assessmentReport,
          skillVerification: profile.skillVerification,
          inferredAiFluency: profile?.inferredAiFluency ?? undefined,
          language,
          videoEnhanced,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- extra fields for playbook generation
        } as any);
        const newOutline = Array.isArray(result?.outline) ? result.outline : [];
        setOutline(newOutline);
        await updateProfile({
          step: 'plan',
          planOutline: JSON.stringify(newOutline),
          planFull: JSON.stringify(result?.fullPlan ?? []),
          planMetadata: JSON.stringify(result?.metadata ?? {}),
          planSearchSources: Array.isArray(result?.searchSources) ? result.searchSources : [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- extra fields for plan persistence
        } as any);

        track('outline_generated', {
          session_id: getSessionId(),
          step: 'plan',
          outline_type: 'playbook',
          module_count: newOutline.length,
          profile_hash: generateProfileHash(profile.profileXml || ''),
          regenerated,
        });
      } catch (error) {
        console.error('Error generating playbook:', error);
        setGenerateFailed(true);
      } finally {
        setIsGenerating(false);
      }
    },
    [generatePlaybook, isGenerating, profile.assessmentReport, profile.profileXml, profile.skillVerification, profile?.inferredAiFluency, updateProfile, track, getSessionId, language, videoEnhanced]
  );

  const handleStartCourseGeneration = useCallback(async () => {
    if (isStartingCourse) return;
    setIsStartingCourse(true);
    try {
      await startGeneration({ videoEnhanced });
    } catch (error) {
      console.error('Error starting course generation:', error);
    } finally {
      setIsStartingCourse(false);
    }
  }, [isStartingCourse, startGeneration, videoEnhanced]);

  const handleSelectPage = useCallback(
    (index: number) => {
      void navigate(`/plan/${index}`);
    },
    [navigate]
  );

  const handleBackToPlan = useCallback(() => {
    void navigate('/plan');
  }, [navigate]);

  // Generate quick tip before outline
  const handleGenerateQuickTip = useCallback(async () => {
    if (isGeneratingTip || profile?.quickTip) return;
    setIsGeneratingTip(true);
    try {
      const chatHistory = profile?.chatHistory || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chatHistory items have dynamic shape
      const chatSummary = chatHistory.map((m: any) => `${m.type}: ${m.content?.slice(0, 2000)}`).join('\n');

      await generateQuickTip({
        profileXml: profile?.profileXml || '',
        chatSummary,
        performanceScore: profile?.skillVerification?.performanceScore,
        fluencyScore: profile?.inferredAiFluency?.score,
        language,
      });
    } catch (error) {
      console.error('Error generating quick tip:', error);
    } finally {
      setIsGeneratingTip(false);
    }
  }, [isGeneratingTip, profile?.quickTip, profile?.profileXml, profile?.chatHistory, profile?.skillVerification?.performanceScore, profile?.inferredAiFluency?.score, generateQuickTip, language]);

  // Refs to prevent double-firing of one-shot generations
  const tipFiredRef = useRef(false);
  const outlineFiredRef = useRef(false);
  const courseFiredRef = useRef(false);

  useEffect(() => {
    setOutline(storedOutline);
  }, [storedOutline]);

  // Generate quick tip once if missing
  useEffect(() => {
    if (!profile?.quickTip && !isGeneratingTip && !tipFiredRef.current) {
      tipFiredRef.current = true;
      void handleGenerateQuickTip();
    }
  }, [profile?.quickTip, isGeneratingTip, handleGenerateQuickTip]);

  // Generate playbook outline once if missing
  useEffect(() => {
    if (!storedOutline && !isGenerating && !generateFailed && !outlineFiredRef.current) {
      outlineFiredRef.current = true;
      void handleGenerate(false);
    }
  }, [storedOutline, isGenerating, generateFailed, handleGenerate]);

  // Start course generation once when outline is ready
  useEffect(() => {
    if (shouldStartGeneration && !isStartingCourse && !courseFiredRef.current) {
      courseFiredRef.current = true;
      void handleStartCourseGeneration();
    }
  }, [shouldStartGeneration, isStartingCourse, handleStartCourseGeneration]);

  // Current document for reader view
  const currentDocument = useMemo(() => {
    if (!documents) return null;
    return documents.find((d) => d.pageIndex === selectedPageIndex) || null;
  }, [documents, selectedPageIndex]);

  const getChapterData = useCallback(
    (chapterNum: ChapterNumber) => {
      if (!currentDocument?.handbook) return null;
      if (chapterNum === 1) return currentDocument.handbook.chapter1;
      if (chapterNum === 2) return currentDocument.handbook.chapter2;
      return currentDocument.handbook.chapter3;
    },
    [currentDocument]
  );

  const chapters = useMemo(() => {
    if (!currentDocument?.handbook) {
      return [
        { number: 1, title: 'Chapter 1' },
        { number: 2, title: 'Chapter 2' },
        { number: 3, title: 'Chapter 3' },
      ];
    }
    return [
      { number: 1, title: currentDocument.handbook.chapter1?.title || 'Chapter 1' },
      { number: 2, title: currentDocument.handbook.chapter2?.title || 'Chapter 2' },
      { number: 3, title: currentDocument.handbook.chapter3?.title || 'Chapter 3' },
    ];
  }, [currentDocument]);

  const completedCount = documents?.filter((d) => d.status === 'completed').length ?? 0;
  const totalCount = documents?.length ?? 0;
  const isAnyGenerating = documents?.some((d) => d.status === 'generating') ?? false;

  // Reader view
  if (viewMode === 'reader') {
    // Video-enhanced: continuous scroll "parchment" reader
    if (videoEnhanced) {
      return (
        <ScrollReaderView
          currentDocument={currentDocument}
          outline={outline}
          selectedPageIndex={selectedPageIndex}
          onBackToPlan={handleBackToPlan}
          onNavigate={(path) => void navigate(path)}
          profileXml={typeof profile?.profileXml === 'string' ? profile.profileXml : undefined}
          toolPreferences={profile?.toolPreferences ?? undefined}
        />
      );
    }

    // Legacy: tabbed chapter reader
    return (
      <ReaderView
        currentDocument={currentDocument}
        outline={outline}
        selectedPageIndex={selectedPageIndex}
        selectedChapter={selectedChapter}
        chapters={chapters}
        documents={documents}
        getChapterData={getChapterData}
        onBackToPlan={handleBackToPlan}
        onSelectChapter={(n) => void navigate(`/plan/${selectedPageIndex}/${n}`, { replace: true })}
        onNavigate={(path) => void navigate(path)}
      />
    );
  }

  // Plan view (main)
  return (
    <div className="max-w-[1100px] mx-auto py-10 px-4 sm:px-6">
      {/* Page header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4" style={{ background: '#fff5f0', color: '#cc4a1a' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          {t('badge')}
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 mb-2">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>

      {/* Quick Tip Widget */}
      {!tipDismissed && (profile?.quickTip || isGeneratingTip) && <QuickTipWidget tip={profile?.quickTip} isGenerating={isGeneratingTip} onDismiss={() => setTipDismissed(true)} />}

      {/* Restore dismissed tip */}
      {tipDismissed && profile?.quickTip ? (
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => setTipDismissed(false)} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
              />
            </svg>
            {t('showInsight')}
          </button>
        </div>
      ) : null}

      {/* Generation progress bar */}
      {documents && documents.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-neutral-500 mb-2">
            <span>{t('progress.modules', { completed: completedCount, total: totalCount })}</span>
            {isAnyGenerating && (
              <span className="flex items-center gap-2 text-orange-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
                {t('progress.generating')}
              </span>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
              }}
            />
          </div>
        </div>
      )}

      {/* Generating plan state */}
      {isGenerating && (
        <div data-testid="plan-loading" className="mb-8 flex items-center gap-3 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-4">
          <div className="w-5 h-5 spinner" style={{ borderTopColor: '#ff6b35' }} />
          <span className="text-sm text-neutral-700">{t('status.generating')}</span>
        </div>
      )}

      {/* Starting course generation state */}
      {isStartingCourse && (!documents || documents.length === 0) && (
        <div className="mb-8 flex items-center gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4">
          <div className="w-5 h-5 spinner" style={{ borderTopColor: '#3b82f6' }} />
          <span className="text-sm text-neutral-700">{t('status.starting')}</span>
        </div>
      )}

      {/* Outline cards */}
      {outline && outline.length > 0 ? (
        <div data-testid="plan-container" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {outline.map((page, index) => {
            const pageNumber = page.page ?? index + 1;
            const doc = documentsByPage.get(index);
            return <OutlineCard key={index} page={page} index={index} diagnostic={diagnosticsByPage.get(pageNumber)} documentStatus={doc?.status} onOpen={() => handleSelectPage(index)} />;
          })}
        </div>
      ) : (
        !isGenerating && (
          <div className="rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-sm text-neutral-500 mb-4">{t('empty.message')}</p>
            <button
              onClick={() => {
                setGenerateFailed(false);
                void handleGenerate(false);
              }}
              className="px-4 py-2 rounded-lg text-white font-medium text-sm"
              style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' }}
            >
              {t('empty.button')}
            </button>
          </div>
        )
      )}
    </div>
  );
}
