import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Id } from '../../../convex/_generated/dataModel';
import { OrderTimeline } from './OrderTimeline';
import { TOPICS } from '../../data/topics';
import { zName } from '../../lib/childNameInflect';

type PipelineStep = {
  status: string;
  agent: string | null;
  label: string;
};

type PipelineEvent = {
  _id: Id<'bookPipelineEvents'>;
  _creationTime: number;
  orderId: Id<'bookOrders'>;
  agent: string;
  event: string;
  narrative: string;
  details?: string;
  timestamp: number;
};

interface ProgressJourneyProps {
  status: string;
  pipelineSteps: ReadonlyArray<PipelineStep>;
  events: PipelineEvent[] | undefined;
  /** Used for personalising engagement tip cards (spec section 5.4). */
  childName?: string;
  ageNumber?: number | null;
  problemId?: string;
  /** Hide the linear "Etapy produkcji" step list (landing flow). */
  showStages?: boolean;
  /** When false, the heading drops the per-stage label and only shows the
   * generic `progress.heading`. Landing flow uses this so first-time
   * visitors don't read internal stage names ("Piszemy bajkę"). */
  showStageLabel?: boolean;
}

/**
 * Best-effort lookup of a human-readable problem title from a problemId
 * (e.g. "fear_of_separation" -> "Bajkoterapia – Dziecko Nie Chce Iść do Przedszkola | Adaptacja").
 * Falls back to a generic phrase for legacy orders where no topic matches.
 */
function resolveProblemTitle(problemId: string | undefined, fallback: string): string {
  if (!problemId) return fallback;
  const topic = TOPICS.find((t) => t.problemId === problemId);
  // Catalog short title is friendlier than the SEO `title` field.
  return topic?.catalog.shortTitle ?? fallback;
}

const STAGE_THRESHOLDS = [
  { pct: 0, icon: '📝' },
  { pct: 35, icon: '🎨' },
  { pct: 70, icon: '📚' },
  { pct: 100, icon: '🎉' },
];

/**
 * Shared progress journey screen used by both auth and landing flows.
 * - Animated icon, gradient progress bar, rotating engagement tip cards.
 * - Linear pipeline-step list underneath for transparency.
 * - Timeline of pipeline events at the bottom.
 *
 * The progress percentage is derived from `status` against the canonical
 * `PIPELINE_STEPS` order — same data the previous UI relied on.
 */
export function ProgressJourney({
  status,
  pipelineSteps,
  events,
  childName,
  ageNumber,
  problemId,
  showStages = true,
  showStageLabel = true,
}: ProgressJourneyProps) {
  const { t } = useTranslation('book');

  // Map status -> percentage based on canonical pipeline order.
  const totalSteps = pipelineSteps.length;
  const currentIndex = useMemo(() => {
    const idx = pipelineSteps.findIndex((s) => s.status === status);
    return idx >= 0 ? idx : 0;
  }, [pipelineSteps, status]);

  // Anchor percent to step index so the bar visibly advances as agents complete.
  const percent = Math.min(100, Math.round(((currentIndex + 1) / totalSteps) * 100));

  const stage = useMemo(() => {
    let s = STAGE_THRESHOLDS[0];
    for (const t of STAGE_THRESHOLDS) {
      if (percent >= t.pct) s = t;
    }
    return s;
  }, [percent]);

  // Rotate engagement tips every 5s. Tip copy supports {{name}}, {{ageNumber}}
  // and {{problemTitle}} interpolation per spec section 5.4 (7 card types).
  const tips = useMemo(() => {
    const trimmed = childName?.trim() ?? '';
    const name = trimmed || 'Twoje dziecko';
    const ageValue = typeof ageNumber === 'number' ? ageNumber : '';
    const problemTitle = resolveProblemTitle(problemId, 'Twoim wyzwaniem');
    const zNameStr = (trimmed && zName(trimmed)) || 'z dzieckiem';
    const params = { name, ageNumber: ageValue, problemTitle, zName: zNameStr };
    return [
      { emoji: '💡', text: t('progress.tip1', params) },
      { emoji: '🧠', text: t('progress.tip2', params) },
      { emoji: '🌟', text: t('progress.tip3', params) },
      { emoji: '📖', text: t('progress.tip4', params) },
      { emoji: '🦉', text: t('progress.tip5', params) },
      { emoji: '🛡️', text: t('progress.tip6', params) },
      { emoji: '💬', text: t('progress.tip7', params) },
    ];
  }, [t, childName, ageNumber, problemId]);

  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [tips.length]);

  const activeStep = pipelineSteps[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-magic-500 font-bold uppercase tracking-widest text-xs sm:text-sm mb-2 block">
            {t('progress.kicker')}
          </span>
          <div className="text-7xl mb-6 inline-block animate-pulse">{stage.icon}</div>
          {showStageLabel && (
            <h1 className="text-2xl md:text-3xl font-black text-calm-900 mb-3">
              {activeStep?.label ?? t('progress.heading')}
            </h1>
          )}
          <p className="text-gray-500 font-medium text-sm md:text-base max-w-md mx-auto">
            {t('progress.description')}
          </p>
        </div>

        {/* Gradient progress bar */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8 mb-6">
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-calm-500 to-magic-500 h-4 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 font-bold text-center mt-3">{percent}%</p>

          {/* Tip card */}
          <div className="bg-calm-50 rounded-2xl p-5 border border-calm-100 mt-6 transition-opacity duration-300">
            <div className="flex items-start gap-3">
              <div className="text-2xl mt-0.5 shrink-0" aria-hidden>
                {tips[tipIndex]?.emoji}
              </div>
              <div>
                <p className="text-xs font-bold text-magic-600 uppercase tracking-wider mb-1">
                  {t('progress.tipHeading')}
                </p>
                <p className="text-gray-700 font-medium leading-relaxed text-sm">
                  {tips[tipIndex]?.text}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Linear step list — transparency for what's happening. Hidden on
            landing flow per parent feedback (too much "behind the scenes"). */}
        {showStages && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-6 mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 px-1">
              {t('progress.stages')}
            </h2>
            <div className="space-y-1.5">
              {pipelineSteps.map((step, i) => {
                let state: 'done' | 'active' | 'waiting';
                if (i < currentIndex) state = 'done';
                else if (i === currentIndex) state = 'active';
                else state = 'waiting';

                return (
                  <div
                    key={step.status}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                      state === 'active'
                        ? 'bg-amber-50 border border-magic-400/40'
                        : state === 'done'
                          ? 'bg-emerald-50/60'
                          : 'bg-transparent'
                    }`}
                  >
                    <div className="shrink-0">
                      {state === 'done' && (
                        <i className="fa-solid fa-circle-check text-green-500" />
                      )}
                      {state === 'active' && (
                        <div className="w-4 h-4 spinner border-magic-400/30 border-t-magic-500" />
                      )}
                      {state === 'waiting' && (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        state === 'active'
                          ? 'font-bold text-calm-900'
                          : state === 'done'
                            ? 'text-gray-600'
                            : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="ml-auto text-[11px] font-semibold text-gray-400">
                      {state === 'done' && t('progress.stepDone')}
                      {state === 'active' && t('progress.stepActive')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {events && events.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">
              {t('progress.timeline')}
            </h2>
            <OrderTimeline events={events} showAgentBadge={false} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Failure screen shown when the pipeline reports `status === 'failed'`.
 * Used by both the auth and landing progress pages — the only thing that
 * differs is the retry destination.
 */
export function BookErrorScreen({
  error,
  retryLabel,
  onRetry,
}: {
  error: string | undefined;
  retryLabel: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation('book');
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full bg-white rounded-3xl border-2 border-red-200 p-8 md:p-10 text-center shadow-xl">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          <i className="fa-solid fa-circle-exclamation" />
        </div>
        <h2 className="text-2xl font-black text-calm-900 mb-3">{t('progress.errorHeading')}</h2>
        <p className="text-base text-red-600 mb-6">{error}</p>
        <button
          onClick={onRetry}
          className="bg-magic-500 hover:bg-magic-600 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg shadow-magic-500/30 transition"
        >
          {retryLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * Pause screen shown when the pipeline reports `status === 'paused'`.
 * Identical between auth and landing flows.
 */
export function BookPausedScreen() {
  const { t } = useTranslation('book');
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full bg-white rounded-3xl border-2 border-yellow-200 p-8 md:p-10 text-center shadow-xl">
        <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          <i className="fa-solid fa-pause" />
        </div>
        <h2 className="text-2xl font-black text-calm-900 mb-3">{t('progress.pausedHeading')}</h2>
        <p className="text-sm text-gray-600">{t('progress.pausedDescription')}</p>
      </div>
    </div>
  );
}
