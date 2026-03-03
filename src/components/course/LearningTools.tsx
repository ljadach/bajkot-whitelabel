import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

/* ── Types ───────────────────────────────────── */

type ConceptState = 'clear' | 'fuzzy' | 'dark';
const CONCEPT_STATES: ConceptState[] = ['clear', 'fuzzy', 'dark'];

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

type TabId = 'probes' | 'contrapositor' | 'conceptRadar' | 'skeletonKey' | 'tomorrow';

interface ConceptItem {
  concept: string;
  hint: string;
  state?: ConceptState;
}

interface SkeletonKeyData {
  level1: string;
  level2: string;
  level3: string;
}

interface TomorrowTask {
  task: string;
  why: string;
  difficulty: 'quick' | 'medium' | 'deep';
}

interface ProbeItem {
  probe: string;
  bloomLevel: string;
}

const SKELETON_WORD_LIMITS = [50, 25, 10] as const;

const DIFFICULTY_CLASS: Record<string, string> = {
  quick: 'wb-tomorrow__badge--quick',
  medium: 'wb-tomorrow__badge--medium',
  deep: 'wb-tomorrow__badge--deep',
};

/* ── ToolTooltip ──────────────────────────────── */

function ToolTooltip({ tabId, children }: { tabId: TabId; children: React.ReactNode }) {
  const { t } = useTranslation('course');
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const storageKey = `aitutoro-tooltip-dismissed:${tabId}`;
  const touchedRef = useRef(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === '1') setDismissed(true);
    } catch {
      // localStorage unavailable
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      // ignore
    }
  };

  if (dismissed) return <>{children}</>;

  return (
    <div
      className="wb-tooltip-wrap"
      onMouseEnter={() => {
        if (!touchedRef.current) setVisible(true);
      }}
      onMouseLeave={() => setVisible(false)}
      onTouchStart={() => {
        touchedRef.current = true;
        setVisible((v) => !v);
      }}
    >
      {children}
      {visible && (
        <div className="wb-tooltip">
          <p className="wb-tooltip__text">{t(`toolkit.tooltips.${tabId}`)}</p>
          <button type="button" className="wb-tooltip__dismiss" onClick={handleDismiss}>
            {t('toolkit.tooltips.dontShowAgain')}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 1. GlossatorMargin ─────────────────────── */

interface GlossatorMarginProps {
  activeChapter: number;
  onSave?: (chapterNumber: number, content: string) => void;
  initialNotes?: Record<number, string[]>;
}

export function GlossatorMargin({ activeChapter, onSave, initialNotes }: GlossatorMarginProps) {
  const { t } = useTranslation('course');
  const [notesByChapter, setNotesByChapter] = useState<Record<number, string[]>>({});
  const [newNote, setNewNote] = useState('');
  const [expandedNote, setExpandedNote] = useState<number | null>(null);
  const [hydratedFrom, setHydratedFrom] = useState<Record<number, string[]> | null>(null);

  // Hydrate from persisted notes on mount or when initialNotes changes
  useEffect(() => {
    if (!initialNotes || initialNotes === hydratedFrom) return;
    setNotesByChapter(initialNotes);
    setHydratedFrom(initialNotes);
  }, [initialNotes, hydratedFrom]);

  const currentNotes = notesByChapter[activeChapter] || [];
  const totalNotes = Object.values(notesByChapter).reduce((sum, arr) => sum + arr.length, 0);

  const handleAddNote = () => {
    const trimmed = newNote.trim();
    if (!trimmed) return;
    const updated = { ...notesByChapter };
    updated[activeChapter] = [...(updated[activeChapter] || []), trimmed];
    setNotesByChapter(updated);
    setNewNote('');
    onSave?.(activeChapter, JSON.stringify(updated[activeChapter]));
  };

  return (
    <div className="glossator-margin" data-active-chapter={activeChapter}>
      {/* Mobile collapsed badge */}
      <div className="glossator-margin__mobile-badge">{totalNotes > 0 && <span className="glossator-margin__count">{totalNotes}</span>}</div>

      {/* Desktop sidebar content */}
      <div className="glossator-margin__content">
        <div className="glossator-margin__chapter-label">{t('toolkit.glossator.chapterLabel', { number: activeChapter })}</div>

        {currentNotes.length === 0 && <p className="glossator-margin__empty">{t('toolkit.glossator.emptyState')}</p>}

        {currentNotes.length > 0 && (
          <div className="glossator-margin__notes">
            {currentNotes.map((note, i) => (
              <div key={i} className={`glossator-margin__note ${expandedNote === i ? 'glossator-margin__note--expanded' : ''}`} onClick={() => setExpandedNote(expandedNote === i ? null : i)}>
                {expandedNote === i ? note : note.length > 60 ? note.slice(0, 60) + '...' : note}
              </div>
            ))}
          </div>
        )}

        <div className="glossator-margin__add">
          <textarea
            className="glossator-margin__textarea"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={t('toolkit.glossator.placeholder')}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddNote();
              }
            }}
          />
          <button type="button" className="glossator-margin__add-btn" disabled={!newNote.trim()} onClick={handleAddNote} title={t('toolkit.glossator.addNote')}>
            +
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Tab icons ───────────────────────────────── */

const TAB_ICONS: Record<TabId, JSX.Element> = {
  probes: (
    <svg className="wb__tab-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3M8 10.5v.5" />
    </svg>
  ),
  contrapositor: (
    <svg className="wb__tab-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  ),
  conceptRadar: (
    <svg className="wb__tab-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="3" />
      <circle cx="8" cy="8" r="0.75" fill="currentColor" />
    </svg>
  ),
  skeletonKey: (
    <svg className="wb__tab-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3h10M5 7h6M7 11h2" />
    </svg>
  ),
  tomorrow: (
    <svg className="wb__tab-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2v4l2.5 2.5M8 14a6 6 0 100-12 6 6 0 000 12z" />
    </svg>
  ),
};

/* ── 2. WorkbenchTabs ────────────────────────── */

const DEFAULT_DRAWER_HEIGHT = 320;
const MIN_DRAWER_HEIGHT = 120;
const MAX_DRAWER_HEIGHT_VH = 0.7; // 70vh

interface WorkbenchTabsProps {
  courseDocumentId?: Id<'courseDocuments'>;
  activeChapter: number;
  chapterContent: string;
  profileXml?: string;
  onSave?: (chapterNumber: number, toolId: string, content: string) => void;
  getArtifactContent?: (chapterNumber: number, toolId: string) => string | undefined;
  getArtifact?: (chapterNumber: number, toolId: string) => { content: string; score?: number; feedback?: string } | undefined;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onGenerateChapter?: (probeText: string) => void;
  explorationCount?: number;
  generatingChapter?: number | null;
  onHeightChange?: (height: number) => void;
}

export function WorkbenchTabs({ courseDocumentId, activeChapter, chapterContent, profileXml, onSave, getArtifactContent, getArtifact, collapsed, onToggleCollapse, onGenerateChapter, explorationCount, generatingChapter, onHeightChange }: WorkbenchTabsProps) {
  const { t } = useTranslation('course');
  const [activeTab, setActiveTab] = useState<TabId>('conceptRadar');
  const [drawerHeight, setDrawerHeight] = useState(DEFAULT_DRAWER_HEIGHT);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  // Touch swipe on drag handle
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      touchStartY.current = null;
      if (Math.abs(deltaY) < 30) return;
      if (deltaY > 0 && !collapsed) onToggleCollapse(); // swipe down → collapse
      if (deltaY < 0 && collapsed) onToggleCollapse(); // swipe up → expand
    },
    [collapsed, onToggleCollapse]
  );

  // Horizontal swipe on panel to switch tabs
  const panelTouchStartX = useRef<number | null>(null);

  const handlePanelTouchStart = useCallback((e: React.TouchEvent) => {
    panelTouchStartX.current = e.touches[0].clientX;
  }, []);

  const tabDefs: { id: TabId; labelKey: string; showCondition?: boolean }[] = [
    { id: 'conceptRadar', labelKey: 'workbench.conceptRadar' },
    { id: 'probes', labelKey: 'workbench.probes' },
    { id: 'contrapositor', labelKey: 'workbench.contrapositor' },
    { id: 'skeletonKey', labelKey: 'workbench.skeletonKey' },
    { id: 'tomorrow', labelKey: 'workbench.tomorrow', showCondition: activeChapter >= 3 },
  ];

  const visibleTabs = tabDefs.filter((tab) => tab.showCondition === undefined || tab.showCondition);

  const handlePanelTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (panelTouchStartX.current === null) return;
      const deltaX = e.changedTouches[0].clientX - panelTouchStartX.current;
      panelTouchStartX.current = null;
      if (Math.abs(deltaX) < 50) return;

      const visibleIds = visibleTabs.map((tab) => tab.id);
      const currentIdx = visibleIds.indexOf(activeTab);
      if (currentIdx === -1) return;

      if (deltaX < 0 && currentIdx < visibleIds.length - 1) {
        setActiveTab(visibleIds[currentIdx + 1]);
      } else if (deltaX > 0 && currentIdx > 0) {
        setActiveTab(visibleIds[currentIdx - 1]);
      }
    },
    [activeTab, visibleTabs]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (collapsed) return;
      e.preventDefault();
      isDragging.current = true;
      startY.current = e.clientY;
      startHeight.current = drawerHeight;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ns-resize';

      const handlePointerMove = (ev: PointerEvent) => {
        if (!isDragging.current) return;
        const delta = startY.current - ev.clientY;
        const maxH = window.innerHeight * MAX_DRAWER_HEIGHT_VH;
        const newH = Math.min(maxH, Math.max(MIN_DRAWER_HEIGHT, startHeight.current + delta));
        setDrawerHeight(newH);
        onHeightChange?.(newH);
      };

      const handlePointerUp = () => {
        isDragging.current = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
      };

      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    },
    [collapsed, drawerHeight, onHeightChange]
  );

  return (
    <div className={`wb ${collapsed ? 'wb--collapsed' : ''}`} style={collapsed ? undefined : { height: `${drawerHeight}px` }}>
      {/* Drag handle */}
      <div className="wb__drag-handle" onPointerDown={handlePointerDown} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ touchAction: 'none' }}>
        <div className="wb__drag-grip" />
      </div>

      <button className="wb__toggle" onClick={onToggleCollapse} type="button" aria-expanded={!collapsed} aria-label={t('scrollReader.workbenchTitle')}>
        <svg className="w-3 h-3 transition-transform" style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
        <span style={{ opacity: collapsed ? 1 : 0.5 }}>{t('scrollReader.workbenchTitle')}</span>
      </button>

      <div className="wb__inner">
        {/* Tab bar */}
        <div className="wb__tabs">
          {visibleTabs.map((tab) => (
            <ToolTooltip key={tab.id} tabId={tab.id}>
              <button type="button" className={`wb__tab ${activeTab === tab.id ? 'wb__tab--active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                {TAB_ICONS[tab.id]}
                {t(`toolkit.${tab.labelKey}`)}
              </button>
            </ToolTooltip>
          ))}
        </div>

        {/* Tab panels */}
        <div className="wb__panel" onTouchStart={handlePanelTouchStart} onTouchEnd={handlePanelTouchEnd}>
          {activeTab === 'probes' && (
            <ProbesPanel
              courseDocumentId={courseDocumentId}
              activeChapter={activeChapter}
              chapterContent={chapterContent}
              profileXml={profileXml}
              onSave={onSave}
              getArtifactContent={getArtifactContent}
              onGenerateChapter={onGenerateChapter}
              explorationCount={explorationCount ?? 0}
              generatingChapter={generatingChapter ?? null}
            />
          )}
          {activeTab === 'contrapositor' && <ContrapositorPanel activeChapter={activeChapter} chapterContent={chapterContent} onSave={onSave} getArtifact={getArtifact} />}
          {activeTab === 'conceptRadar' && <ConceptRadarPanel activeChapter={activeChapter} chapterContent={chapterContent} profileXml={profileXml} onSave={onSave} getArtifactContent={getArtifactContent} />}
          {activeTab === 'skeletonKey' && <SkeletonKeyPanel activeChapter={activeChapter} chapterContent={chapterContent} profileXml={profileXml} onSave={onSave} getArtifactContent={getArtifactContent} />}
          {activeTab === 'tomorrow' && <TomorrowPanel chapterContent={chapterContent} profileXml={profileXml} courseDocumentId={courseDocumentId} onSave={onSave} getArtifactContent={getArtifactContent} />}
        </div>
      </div>
    </div>
  );
}

/* ── Probes Panel (dynamic) ──────────────────── */

interface ProbesPanelProps {
  courseDocumentId?: Id<'courseDocuments'>;
  activeChapter: number;
  chapterContent: string;
  profileXml?: string;
  onSave?: (chapterNumber: number, toolId: string, content: string) => void;
  getArtifactContent?: (chapterNumber: number, toolId: string) => string | undefined;
  onGenerateChapter?: (probeText: string) => void;
  explorationCount: number;
  generatingChapter: number | null;
}

function ProbesPanel({ courseDocumentId, activeChapter, chapterContent, profileXml, onSave, getArtifactContent, onGenerateChapter, explorationCount, generatingChapter }: ProbesPanelProps) {
  const { t } = useTranslation('course');
  const generateProbes = useAction(api.instrumentAi.generateProbes);
  const [probes, setProbes] = useState<ProbeItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [lastChapter, setLastChapter] = useState(activeChapter);
  const [customTopic, setCustomTopic] = useState('');

  const currentTotal = 3 + explorationCount;
  const maxChapters = 10;
  const canGenerate = generatingChapter === null && explorationCount < 7;

  // Hydrate from persisted content
  const savedContent = getArtifactContent?.(activeChapter, 'probes');
  useEffect(() => {
    if (activeChapter !== lastChapter) {
      setHydrated(false);
      setProbes([]);
      setLastChapter(activeChapter);
      return;
    }
    if (hydrated || !savedContent) return;
    try {
      const parsed: unknown = JSON.parse(savedContent);
      if (Array.isArray(parsed)) {
        setProbes(parsed as ProbeItem[]);
      }
    } catch {
      // ignore malformed
    }
    setHydrated(true);
  }, [savedContent, hydrated, activeChapter, lastChapter]);

  const handleGenerate = async () => {
    if (!chapterContent || !profileXml || !courseDocumentId) return;
    setGenerating(true);
    try {
      const result = await generateProbes({
        courseDocumentId,
        chapterNumber: activeChapter,
        profileXml,
        chapterContent,
      });
      setProbes(result);
      onSave?.(activeChapter, 'probes', JSON.stringify(result));
    } catch {
      // generation failed
    } finally {
      setGenerating(false);
    }
  };

  const handleCustomGenerate = () => {
    const trimmed = customTopic.trim();
    if (!trimmed || !canGenerate) return;
    onGenerateChapter?.(trimmed);
    setCustomTopic('');
  };

  if (!chapterContent) {
    return (
      <div className="wb-probes">
        <div className="wb-contra__empty">
          <svg className="wb-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v3M12 14.5v.5" />
          </svg>
          <span className="wb-empty__title">{t('toolkit.probes.noContent')}</span>
          <span className="wb-empty__hint">{t('toolkit.probes.emptyHint')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="wb-probes">
      <div className="wb-probes__header">
        <span>{t('toolkit.workbench.probes')}</span>
        <span className="wb-probes__chapter-count">{t('exploration.chapterCount', { current: currentTotal, max: maxChapters })}</span>
      </div>

      {/* Dynamic generated probes */}
      {probes.length === 0 && !generating && (
        <button type="button" className="wb-radar__generate" onClick={() => void handleGenerate()} disabled={!profileXml} style={{ marginBottom: 8 }}>
          {t('toolkit.probes.generate')}
        </button>
      )}

      {generating && (
        <div className="wb-skeleton-loader">
          {[1, 2, 3].map((i) => (
            <div key={i} className="wb-skeleton-loader__bar" />
          ))}
        </div>
      )}

      {probes.length > 0 && (
        <div className="wb-probes__chips">
          {probes.map((p, i) => (
            <div key={i} className="wb-probes__chip-group">
              <span className="wb-probes__bloom">{p.bloomLevel}</span>
              <span className="wb-probes__chip">{p.probe}</span>
              <button type="button" className="wb-probes__generate-btn" onClick={() => onGenerateChapter?.(p.probe)} disabled={!canGenerate} title={explorationCount >= 7 ? t('exploration.maxReached') : t('exploration.generateChapter')}>
                +
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Divider between probes and custom input */}
      {probes.length > 0 && <div className="wb-probes__divider" />}

      {/* Custom topic input */}
      <div className="wb-probes__custom">
        <input
          type="text"
          className="wb-probes__custom-input"
          value={customTopic}
          onChange={(e) => setCustomTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && customTopic.trim()) handleCustomGenerate();
          }}
          placeholder={t('exploration.customPlaceholder')}
          disabled={!canGenerate}
        />
        <button type="button" className="wb-probes__generate-btn" onClick={handleCustomGenerate} disabled={!canGenerate || !customTopic.trim()} title={t('exploration.generateChapter')}>
          +
        </button>
      </div>
      {generatingChapter !== null && (
        <div className="wb-probes__generating-text">
          <div className="w-3 h-3 spinner" />
          {t('exploration.generating', { number: generatingChapter })}
        </div>
      )}
    </div>
  );
}

/* ── Contrapositor Panel ─────────────────────── */

function getScoreRarity(score: number): string {
  if (score >= 95) return 'wb-contra__score--legendary';
  if (score >= 80) return 'wb-contra__score--epic';
  if (score >= 60) return 'wb-contra__score--rare';
  if (score >= 30) return 'wb-contra__score--uncommon';
  return 'wb-contra__score--common';
}

interface ContrapositorPanelProps {
  activeChapter: number;
  chapterContent: string;
  onSave?: (chapterNumber: number, toolId: string, content: string) => void;
  getArtifact?: (chapterNumber: number, toolId: string) => { content: string; score?: number; feedback?: string } | undefined;
}

function ContrapositorPanel({ activeChapter, chapterContent, onSave, getArtifact }: ContrapositorPanelProps) {
  const { t } = useTranslation('course');
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedValue, setSubmittedValue] = useState('');

  const artifact = getArtifact?.(activeChapter, 'contrapositor');

  // Hydrate from persisted artifact
  useEffect(() => {
    if (artifact?.content) {
      setSubmittedValue(artifact.content);
      setSubmitted(true);
      setValue('');
    } else {
      setSubmitted(false);
      setSubmittedValue('');
    }
  }, [activeChapter, artifact?.content]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || !chapterContent) return;
    setSubmitted(true);
    setSubmittedValue(trimmed);
    onSave?.(activeChapter, 'contrapositor', trimmed);
    setValue('');
  };

  if (!chapterContent) {
    return (
      <div className="wb-contra">
        <div className="wb-contra__empty">
          <svg className="wb-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" />
          </svg>
          <span className="wb-empty__title">{t('toolkit.contrapositor.noContent')}</span>
          <span className="wb-empty__hint">{t('toolkit.contrapositor.emptyHint')}</span>
        </div>
      </div>
    );
  }

  if (submitted) {
    const score = artifact?.score;
    const feedback = artifact?.feedback;
    const isScoring = !score && !feedback;

    return (
      <div className="wb-contra wb-contra--done">
        <p className="wb-contra__answer">{submittedValue}</p>
        {isScoring ? (
          <div className="wb-contra__scoring">
            <div className="w-4 h-4 spinner" />
            <span>{t('toolkit.contrapositor.scoring')}</span>
          </div>
        ) : (
          <div className="wb-contra__result">
            <span className={`wb-contra__score ${score ? getScoreRarity(score) : ''}`}>{t('toolkit.contrapositor.score', { score })}</span>
            {feedback && <p className="wb-contra__feedback">{feedback}</p>}
          </div>
        )}
        <button
          type="button"
          className="wb-contra__submit"
          style={{ marginTop: 8, background: 'transparent', color: '#E8804C', border: '1px solid #E8804C' }}
          onClick={() => {
            setValue(submittedValue);
            setSubmitted(false);
            setSubmittedValue('');
          }}
        >
          {t('toolkit.contrapositor.resubmit')}
        </button>
      </div>
    );
  }

  return (
    <div className="wb-contra">
      <p className="wb-contra__prompt">{t('toolkit.contrapositor.prompt')}</p>
      <textarea className="wb-contra__textarea" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t('toolkit.contrapositor.placeholder')} rows={3} />
      <button type="button" className="wb-contra__submit" disabled={!value.trim()} onClick={handleSubmit}>
        {t('toolkit.contrapositor.submit')}
      </button>
    </div>
  );
}

/* ── Concept Radar Panel ─────────────────────── */

interface ConceptRadarPanelProps {
  activeChapter: number;
  chapterContent: string;
  profileXml?: string;
  onSave?: (chapterNumber: number, toolId: string, content: string) => void;
  getArtifactContent?: (chapterNumber: number, toolId: string) => string | undefined;
}

function ConceptRadarPanel({ activeChapter, chapterContent, profileXml, onSave, getArtifactContent }: ConceptRadarPanelProps) {
  const { t } = useTranslation('course');
  const generateRadar = useAction(api.instrumentAi.generateConceptRadar);
  const [concepts, setConcepts] = useState<ConceptItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [lastChapter, setLastChapter] = useState(activeChapter);
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  // Hydrate from persisted content
  const savedContent = getArtifactContent?.(activeChapter, 'conceptRadar');
  useEffect(() => {
    if (activeChapter !== lastChapter) {
      setHydrated(false);
      setConcepts([]);
      setLastChapter(activeChapter);
      return;
    }
    if (hydrated || !savedContent) return;
    try {
      const parsed: unknown = JSON.parse(savedContent);
      if (Array.isArray(parsed)) {
        setConcepts(parsed as ConceptItem[]);
      }
    } catch {
      // ignore malformed
    }
    setHydrated(true);
  }, [savedContent, hydrated, activeChapter, lastChapter]);

  const handleGenerate = async () => {
    if (!chapterContent || !profileXml) return;
    setGenerating(true);
    try {
      const result = await generateRadar({
        chapterContent,
        chapterNumber: activeChapter,
        profileXml,
      });
      const items: ConceptItem[] = result.map((r) => ({
        concept: r.concept,
        hint: r.hint,
      }));
      setConcepts(items);
      setExpandedItems({}); // all collapsed by default
      onSave?.(activeChapter, 'conceptRadar', JSON.stringify(items));
    } catch {
      // generation failed silently
    } finally {
      setGenerating(false);
    }
  };

  const toggleItem = (idx: number) => {
    setExpandedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleAll = () => {
    const allExpanded = concepts.every((_, i) => expandedItems[i]);
    if (allExpanded) {
      setExpandedItems({});
    } else {
      const all: Record<number, boolean> = {};
      concepts.forEach((_, i) => {
        all[i] = true;
      });
      setExpandedItems(all);
    }
  };

  const handleSetState = (idx: number, state: ConceptState) => {
    const updated = [...concepts];
    updated[idx] = { ...updated[idx], state };
    setConcepts(updated);
    onSave?.(activeChapter, 'conceptRadar', JSON.stringify(updated));
  };

  if (!chapterContent) {
    return (
      <div className="wb-radar">
        <div className="wb-radar__empty">
          <svg className="wb-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
          </svg>
          <span className="wb-empty__title">{t('toolkit.conceptRadar.noContent')}</span>
          <span className="wb-empty__hint">{t('toolkit.conceptRadar.emptyHint')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="wb-radar">
      {concepts.length === 0 && !generating && (
        <button type="button" className="wb-radar__generate" onClick={() => void handleGenerate()} disabled={!profileXml}>
          {t('toolkit.conceptRadar.generate')}
        </button>
      )}

      {generating && (
        <div className="wb-skeleton-loader">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="wb-skeleton-loader__bar" />
          ))}
        </div>
      )}

      {concepts.length > 0 && (
        <>
          <div className="wb-collapse-header">
            <span className="wb-collapse-header__count">{concepts.length} concepts</span>
            <button type="button" className="wb-collapse-header__toggle" onClick={toggleAll}>
              {concepts.every((_, i) => expandedItems[i]) ? t('toolkit.collapseAll', 'Collapse all') : t('toolkit.expandAll', 'Expand all')}
            </button>
          </div>
          <div className="wb-radar__list">
            {concepts.map((c, i) => {
              const isExpanded = !!expandedItems[i];
              return (
                <div key={i} className={`wb-radar__item ${isExpanded ? '' : 'wb-radar__item--collapsed'}`} onClick={() => toggleItem(i)}>
                  <div className="wb-radar__term-row">
                    <span className="wb-radar__term">{c.concept}</span>
                    <div className="wb-radar__states" onClick={(e) => e.stopPropagation()}>
                      {CONCEPT_STATES.map((s) => (
                        <button key={s} type="button" className={`wb-radar__state wb-radar__state--${s} ${c.state === s ? 'active' : ''}`} onClick={() => handleSetState(i, s)}>
                          {t(`toolkit.conceptRadar.${s}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {isExpanded && <p className="wb-radar__hint">{c.hint}</p>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Skeleton Key Panel ──────────────────────── */

interface SkeletonKeyPanelProps {
  activeChapter: number;
  chapterContent: string;
  profileXml?: string;
  onSave?: (chapterNumber: number, toolId: string, content: string) => void;
  getArtifactContent?: (chapterNumber: number, toolId: string) => string | undefined;
}

function SkeletonKeyPanel({ activeChapter, chapterContent, profileXml, onSave, getArtifactContent }: SkeletonKeyPanelProps) {
  const { t } = useTranslation('course');
  const generateSkeleton = useAction(api.instrumentAi.generateSkeletonKey);
  const [skeletonMode, setSkeletonMode] = useState<'auto' | 'manual'>('auto');
  const [data, setData] = useState<SkeletonKeyData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [lastChapter, setLastChapter] = useState(activeChapter);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Manual mode state
  const [manualDrafts, setManualDrafts] = useState(['', '', '']);
  const [manualSubmitted, setManualSubmitted] = useState<(string | null)[]>([null, null, null]);

  // Hydrate from persisted content
  const savedContent = getArtifactContent?.(activeChapter, 'skeletonKey');
  useEffect(() => {
    if (activeChapter !== lastChapter) {
      setHydrated(false);
      setData(null);
      setManualDrafts(['', '', '']);
      setManualSubmitted([null, null, null]);
      setSkeletonMode('auto');
      setLastChapter(activeChapter);
      return;
    }
    if (hydrated || !savedContent) return;
    try {
      const parsed: unknown = JSON.parse(savedContent);
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        if (obj.mode === 'manual' && Array.isArray(obj.levels)) {
          setSkeletonMode('manual');
          const levels = obj.levels as (string | null)[];
          setManualSubmitted(levels);
          setManualDrafts(levels.map((l) => l ?? ''));
        } else if ('level1' in obj) {
          setSkeletonMode('auto');
          setData(parsed as SkeletonKeyData);
        }
      }
    } catch {
      // ignore malformed
    }
    setHydrated(true);
  }, [savedContent, hydrated, activeChapter, lastChapter]);

  const handleGenerate = async () => {
    if (!chapterContent || !profileXml) return;
    setGenerating(true);
    try {
      const result = await generateSkeleton({
        chapterContent,
        chapterNumber: activeChapter,
        profileXml,
      });
      setData(result);
      setExpandedCards({}); // all collapsed by default
      onSave?.(activeChapter, 'skeletonKey', JSON.stringify(result));
    } catch {
      // generation failed silently
    } finally {
      setGenerating(false);
    }
  };

  const toggleSkeletonCard = (key: string) => {
    setExpandedCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllSkeleton = () => {
    const keys = ['level1', 'level2', 'level3'];
    const allExpanded = keys.every((k) => expandedCards[k]);
    if (allExpanded) {
      setExpandedCards({});
    } else {
      setExpandedCards({ level1: true, level2: true, level3: true });
    }
  };

  const handleManualDraftChange = (idx: number, value: string) => {
    const updated = [...manualDrafts];
    updated[idx] = value;
    setManualDrafts(updated);
  };

  const handleManualSubmit = (idx: number) => {
    const trimmed = manualDrafts[idx].trim();
    if (!trimmed) return;
    const updated = [...manualSubmitted];
    updated[idx] = trimmed;
    setManualSubmitted(updated);
    onSave?.(activeChapter, 'skeletonKey', JSON.stringify({ mode: 'manual', levels: updated }));
  };

  const isManualLevelUnlocked = (idx: number) => {
    if (idx === 0) return true;
    return manualSubmitted[idx - 1] !== null;
  };

  const allManualDone = manualSubmitted.every((s) => s !== null);

  if (!chapterContent) {
    return (
      <div className="wb-skeleton">
        <div className="wb-skeleton__empty">
          <svg className="wb-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4h16M7 9h10M10 14h4" />
          </svg>
          <span className="wb-empty__title">{t('toolkit.skeletonKey.noContent')}</span>
          <span className="wb-empty__hint">{t('toolkit.skeletonKey.emptyHint')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="wb-skeleton">
      {/* Mode toggle */}
      <div className="wb-skeleton-mode">
        <button type="button" className={`wb-skeleton-mode__btn ${skeletonMode === 'auto' ? 'active' : ''}`} onClick={() => setSkeletonMode('auto')}>
          {t('toolkit.skeletonKey.autoMode')}
        </button>
        <button type="button" className={`wb-skeleton-mode__btn ${skeletonMode === 'manual' ? 'active' : ''}`} onClick={() => setSkeletonMode('manual')}>
          {t('toolkit.skeletonKey.manualMode')}
        </button>
      </div>

      {/* Auto mode */}
      {skeletonMode === 'auto' && (
        <>
          {!data && !generating && (
            <button type="button" className="wb-skeleton__generate" onClick={() => void handleGenerate()} disabled={!profileXml}>
              {t('toolkit.skeletonKey.generate')}
            </button>
          )}

          {generating && (
            <div className="wb-skeleton-loader wb-skeleton-loader--cards">
              {[1, 2, 3].map((i) => (
                <div key={i} className="wb-skeleton-loader__bar" />
              ))}
            </div>
          )}

          {data && (
            <>
              <div className="wb-collapse-header">
                <span className="wb-collapse-header__count">3 levels</span>
                <button type="button" className="wb-collapse-header__toggle" onClick={toggleAllSkeleton}>
                  {['level1', 'level2', 'level3'].every((k) => expandedCards[k]) ? t('toolkit.collapseAll', 'Collapse all') : t('toolkit.expandAll', 'Expand all')}
                </button>
              </div>
              <div className="wb-skeleton__levels">
                {(
                  [
                    { key: 'level1', label: t('toolkit.skeletonKey.level1'), text: data.level1 },
                    { key: 'level2', label: t('toolkit.skeletonKey.level2'), text: data.level2 },
                    { key: 'level3', label: t('toolkit.skeletonKey.level3'), text: data.level3 },
                  ] as const
                ).map((level) => {
                  const isExpanded = !!expandedCards[level.key];
                  return (
                    <div key={level.key} className={`wb-skeleton__card wb-skeleton__card--${level.key} ${isExpanded ? 'wb-skeleton__card--expanded' : 'wb-skeleton__card--collapsed'}`} onClick={() => toggleSkeletonCard(level.key)}>
                      <div className="wb-skeleton__card-header">
                        <span className="wb-skeleton__card-label">{level.label}</span>
                        <span className="wb-skeleton__word-count">{countWords(level.text)}w</span>
                      </div>
                      {isExpanded && <p className="wb-skeleton__card-text">{level.text}</p>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Manual mode */}
      {skeletonMode === 'manual' && (
        <div className="wb-skeleton__levels">
          {(
            [
              { key: 'level1', label: t('toolkit.skeletonKey.level1Label'), max: SKELETON_WORD_LIMITS[0] },
              { key: 'level2', label: t('toolkit.skeletonKey.level2Label'), max: SKELETON_WORD_LIMITS[1] },
              { key: 'level3', label: t('toolkit.skeletonKey.level3Label'), max: SKELETON_WORD_LIMITS[2] },
            ] as const
          ).map((level, idx) => {
            const unlocked = isManualLevelUnlocked(idx);
            const submitted = manualSubmitted[idx];
            const words = countWords(manualDrafts[idx]);
            const isOver = words > level.max;

            return (
              <div key={level.key} className={`wb-skeleton__card wb-skeleton__card--${level.key}`}>
                <div className="wb-skeleton__card-header">
                  <span className="wb-skeleton__card-label">{level.label}</span>
                </div>
                {submitted !== null ? (
                  <p className="wb-skeleton__card-text">{submitted}</p>
                ) : unlocked ? (
                  <>
                    <textarea className="wb-skeleton-manual__textarea" value={manualDrafts[idx]} onChange={(e) => handleManualDraftChange(idx, e.target.value)} rows={3} />
                    <div className="wb-skeleton-manual__footer">
                      <span className={`wb-skeleton-manual__counter ${isOver ? 'wb-skeleton-manual__counter--over' : ''}`}>{t('toolkit.skeletonKey.wordCount', { count: words, max: level.max })}</span>
                      <button type="button" className="wb-skeleton-manual__submit" disabled={!manualDrafts[idx].trim() || isOver} onClick={() => handleManualSubmit(idx)}>
                        {t('toolkit.skeletonKey.lockIn')}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="wb-skeleton__card-text" style={{ opacity: 0.4, fontStyle: 'italic' }}>
                    ...
                  </p>
                )}
              </div>
            );
          })}
          {allManualDone && <div className="wb-skeleton-manual__done">{t('toolkit.skeletonKey.allDone')}</div>}
        </div>
      )}
    </div>
  );
}

/* ── Tomorrow Panel ──────────────────────────── */

interface TomorrowPanelProps {
  chapterContent: string;
  profileXml?: string;
  courseDocumentId?: Id<'courseDocuments'>;
  onSave?: (chapterNumber: number, toolId: string, content: string) => void;
  getArtifactContent?: (chapterNumber: number, toolId: string) => string | undefined;
}

function TomorrowPanel({ chapterContent, profileXml, courseDocumentId, onSave, getArtifactContent }: TomorrowPanelProps) {
  const { t } = useTranslation('course');
  const generateTasks = useAction(api.instrumentAi.generateTomorrowTasks);
  const [tasks, setTasks] = useState<TomorrowTask[]>([]);
  const [generating, setGenerating] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});

  // Hydrate from persisted content (module-level, chapter 0)
  const savedContent = getArtifactContent?.(0, 'tomorrow');
  useEffect(() => {
    if (hydrated || !savedContent) return;
    try {
      const parsed: unknown = JSON.parse(savedContent);
      if (Array.isArray(parsed)) {
        setTasks(parsed as TomorrowTask[]);
      }
    } catch {
      // ignore malformed
    }
    setHydrated(true);
  }, [savedContent, hydrated]);

  const handleGenerate = async () => {
    if (!chapterContent || !profileXml || !courseDocumentId) return;
    setGenerating(true);
    try {
      const result = await generateTasks({
        chapterContent,
        profileXml,
        courseDocumentId,
      });
      const typed = result.map((r) => ({
        task: r.task,
        why: r.why,
        difficulty: r.difficulty as TomorrowTask['difficulty'],
      }));
      setTasks(typed);
      setExpandedTasks({}); // all collapsed by default
      onSave?.(0, 'tomorrow', JSON.stringify(typed));
    } catch {
      // generation failed silently
    } finally {
      setGenerating(false);
    }
  };

  if (!chapterContent) {
    return (
      <div className="wb-tomorrow">
        <div className="wb-tomorrow__empty">
          <svg className="wb-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2v4l3 3M12 22a10 10 0 100-20 10 10 0 000 20z" />
          </svg>
          <span className="wb-empty__title">{t('toolkit.tomorrow.noContent')}</span>
          <span className="wb-empty__hint">{t('toolkit.tomorrow.emptyHint')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="wb-tomorrow">
      {tasks.length === 0 && !generating && (
        <button type="button" className="wb-tomorrow__generate" onClick={() => void handleGenerate()} disabled={!profileXml || !courseDocumentId}>
          {t('toolkit.tomorrow.generate')}
        </button>
      )}

      {generating && (
        <div className="wb-skeleton-loader wb-skeleton-loader--cards">
          {[1, 2, 3].map((i) => (
            <div key={i} className="wb-skeleton-loader__bar" />
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <>
          <div className="wb-collapse-header">
            <span className="wb-collapse-header__count">{tasks.length} tasks</span>
            <button
              type="button"
              className="wb-collapse-header__toggle"
              onClick={() => {
                const allExpanded = tasks.every((_, i) => expandedTasks[i]);
                if (allExpanded) {
                  setExpandedTasks({});
                } else {
                  const all: Record<number, boolean> = {};
                  tasks.forEach((_, i) => {
                    all[i] = true;
                  });
                  setExpandedTasks(all);
                }
              }}
            >
              {tasks.every((_, i) => expandedTasks[i]) ? t('toolkit.collapseAll', 'Collapse all') : t('toolkit.expandAll', 'Expand all')}
            </button>
          </div>
          <div className="wb-tomorrow__tasks">
            {tasks.map((task, i) => {
              const isExpanded = !!expandedTasks[i];
              return (
                <div key={i} className={`wb-tomorrow__card ${isExpanded ? 'wb-tomorrow__card--expanded' : 'wb-tomorrow__card--collapsed'}`} onClick={() => setExpandedTasks((prev) => ({ ...prev, [i]: !prev[i] }))}>
                  <div className="wb-tomorrow__card-header">
                    <span className={`wb-tomorrow__badge ${DIFFICULTY_CLASS[task.difficulty] || ''}`}>{t(`toolkit.tomorrow.${task.difficulty}`)}</span>
                    {!isExpanded && (
                      <span className="wb-tomorrow__task" style={{ display: 'inline', margin: '0 0 0 8px', fontSize: 12 }}>
                        {task.task}
                      </span>
                    )}
                  </div>
                  {isExpanded && (
                    <>
                      <p className="wb-tomorrow__task">{task.task}</p>
                      <p className="wb-tomorrow__why">{task.why}</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
