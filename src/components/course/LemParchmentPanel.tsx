import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const FEYNMAN_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;
const ALL_PROBE_KEYS = ['probe1', 'probe2', 'probe3', 'probe4', 'probe5'] as const;

// Learning arc: which probes surface after which chapter
const CHAPTER_PROBE_KEYS: Record<number, string[]> = {
  1: ['probe1', 'probe4'], // Foundation: compress + explain simply
  2: ['probe2', 'probe3'], // Deepening: apply + stress-test
  3: ['probe5'], // Synthesis: what would Trurl build?
};

/* ── Feynman Oracle (floating margin element) ────────── */

interface FeynmanOracleProps {
  activeChapter?: number;
  chapterContent?: string;
  profileXml?: string;
  onSave?: (chapterNumber: number, toolId: string, content: string) => void;
  getArtifactContent?: (chapterNumber: number, toolId: string) => string | undefined;
}

export function FeynmanOracle({ activeChapter, chapterContent, profileXml, onSave, getArtifactContent }: FeynmanOracleProps) {
  const { t } = useTranslation('course');
  const generateFeynman = useAction(api.instrumentAi.generateFeynmanQuestions);
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dynamicQuestions, setDynamicQuestions] = useState<string[]>([]);
  const [hydratedChapter, setHydratedChapter] = useState<number | null>(null);

  // Static fallback questions
  const staticQuestions = useMemo(() => FEYNMAN_KEYS.map((k) => t(`lemParchment.feynmanQuestions.${k}`)), [t]);

  // Hydrate from persisted artifact
  const chapter = activeChapter ?? 1;
  const savedContent = getArtifactContent?.(chapter, 'feynmanOracle');

  useEffect(() => {
    if (chapter !== hydratedChapter) {
      setDynamicQuestions([]);
      setHydratedChapter(chapter);
      setIdx(0);
    }
  }, [chapter, hydratedChapter]);

  useEffect(() => {
    if (!savedContent || dynamicQuestions.length > 0) return;
    try {
      const parsed: unknown = JSON.parse(savedContent);
      if (Array.isArray(parsed)) {
        setDynamicQuestions((parsed as Array<{ question: string }>).map((q) => q.question));
      }
    } catch {
      // ignore malformed
    }
  }, [savedContent, dynamicQuestions.length]);

  // Auto-generate on first open if no saved questions
  const handleOpen = useCallback(async () => {
    if (!open) {
      setOpen(true);
      if (dynamicQuestions.length === 0 && !generating && chapterContent && profileXml) {
        setGenerating(true);
        try {
          const result = await generateFeynman({
            chapterContent,
            chapterNumber: chapter,
            profileXml,
          });
          const questions = result.map((r) => r.question);
          setDynamicQuestions(questions);
          setIdx(0);
          onSave?.(chapter, 'feynmanOracle', JSON.stringify(result));
        } catch {
          // fall back to static
        } finally {
          setGenerating(false);
        }
      }
    }
  }, [open, dynamicQuestions.length, generating, chapterContent, profileXml, chapter, generateFeynman, onSave]);

  const questions = dynamicQuestions.length > 0 ? dynamicQuestions : staticQuestions;
  const rotate = () => setIdx((i) => (i + 1) % questions.length);

  return (
    <div className={`feynman-oracle ${open ? 'feynman-oracle--open' : ''}`}>
      <button
        className="feynman-oracle__trigger"
        onClick={() => {
          if (!open) void handleOpen();
          else rotate();
        }}
        title={t('lemParchment.feynmanHint')}
        type="button"
        aria-label="Feynman question"
      >
        <span className="feynman-oracle__glyph">?</span>
      </button>
      {open && (
        <div className="feynman-oracle__bubble">
          <button className="feynman-oracle__close" onClick={() => setOpen(false)} type="button" aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {generating ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <div className="w-3 h-3 spinner" />
              <span style={{ fontSize: '0.82rem', color: '#7a756c' }}>{t('lemParchment.feynmanGenerating')}</span>
            </div>
          ) : (
            <p className="feynman-oracle__question">{questions[idx]}</p>
          )}
          <button className="feynman-oracle__rotate" onClick={rotate} type="button">
            {t('lemParchment.feynmanHint')} &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Chapter Probes (end-of-chapter thinking prompts) ── */

interface ChapterProbesProps {
  chapterNumber: number;
  onSelectProbe?: (probeText: string) => void;
}

export function ChapterProbes({ chapterNumber, onSelectProbe }: ChapterProbesProps) {
  const { t } = useTranslation('course');
  const probes = useMemo(() => {
    const keys = CHAPTER_PROBE_KEYS[chapterNumber] || [];
    return keys.map((k) => ({ key: k, text: t(`lemParchment.${k}`) }));
  }, [t, chapterNumber]);

  if (probes.length === 0) return null;

  return (
    <div className="chapter-probes">
      <span className="chapter-probes__label">{t('lemParchment.probesLabel')}</span>
      <div className="chapter-probes__row">
        {probes.map((p) => (
          <button key={p.key} type="button" className="chapter-probes__chip" onClick={() => onSelectProbe?.(p.text)}>
            {p.text}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Legacy composed panel (for ReaderView.tsx) ──────── */

interface LemParchmentPanelProps {
  moduleNumber: number;
  moduleTitle: string;
  chapterNumber?: number;
  chapterTitle?: string;
  summary?: string;
  onSelectProbe?: (probeText: string) => void;
}

export function LemParchmentPanel({ moduleTitle, chapterNumber, chapterTitle, summary, onSelectProbe }: LemParchmentPanelProps) {
  const { t } = useTranslation('course');
  const probes = useMemo(() => ALL_PROBE_KEYS.map((k) => t(`lemParchment.${k}`)), [t]);

  const chapterContext = chapterTitle ? `${t('scrollReader.chapter', { number: chapterNumber ?? 1 })}: ${chapterTitle}` : t('lemParchment.chapterContextFallback');

  return (
    <div className="cognition-strip" data-testid="lem-parchment-panel">
      <div className="cognition-strip__head">
        <div className="cognition-strip__meta">
          <span className="cognition-strip__kicker">{t('lemParchment.kicker')}</span>
          <span className="cognition-strip__dot">&middot;</span>
          <span className="cognition-strip__context">{t('lemParchment.contextBrief', { moduleTitle, chapterContext })}</span>
        </div>
      </div>
      <div className="cognition-strip__probes">
        <span className="cognition-strip__probes-label">{t('lemParchment.probesLabel')}</span>
        {probes.map((p) => (
          <button key={p} type="button" className="cognition-strip__probe" onClick={() => onSelectProbe?.(p)}>
            {p}
          </button>
        ))}
      </div>
      {summary?.trim() && <p className="cognition-strip__signal">{t('lemParchment.signal', { summary: summary.trim() })}</p>}
    </div>
  );
}
