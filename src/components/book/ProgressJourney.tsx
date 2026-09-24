import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { zName } from '../../lib/childNameInflect';

type PipelineStep = {
  status: string;
  agent: string | null;
  label: string;
};

interface ProgressJourneyProps {
  status: string;
  pipelineSteps: ReadonlyArray<PipelineStep>;
  /** Used for personalising the tip cards. */
  childName?: string;
}

const STAGE_THRESHOLDS = [
  { pct: 0, icon: '📝' },
  { pct: 35, icon: '🎨' },
  { pct: 70, icon: '📚' },
  { pct: 100, icon: '🎉' },
];

/**
 * Progress screen while the book is being made: animated stage icon,
 * gradient progress bar and rotating tip cards. Deliberately no internal
 * stage names or event log — parents see the magic, not the machinery.
 *
 * The percentage is derived from `status` against the canonical
 * `PIPELINE_STEPS` order.
 */
export function ProgressJourney({ status, pipelineSteps, childName }: ProgressJourneyProps) {
  const { t } = useTranslation('book');

  const totalSteps = pipelineSteps.length;
  const currentIndex = useMemo(() => {
    const idx = pipelineSteps.findIndex((s) => s.status === status);
    return idx >= 0 ? idx : 0;
  }, [pipelineSteps, status]);

  // Anchor percent to step index so the bar visibly advances as agents complete.
  const percent = Math.min(100, Math.round(((currentIndex + 1) / totalSteps) * 100));

  const stage = useMemo(() => {
    let s = STAGE_THRESHOLDS[0];
    for (const threshold of STAGE_THRESHOLDS) {
      if (percent >= threshold.pct) s = threshold;
    }
    return s;
  }, [percent]);

  // Rotate tips every 5s. Copy supports {{name}} and {{zName}} interpolation.
  const tips = useMemo(() => {
    const trimmed = childName?.trim() ?? '';
    const params = {
      name: trimmed || 'Twoje dziecko',
      zName: zName(trimmed) ?? 'z dzieckiem',
    };
    return [
      { emoji: '🧠', text: t('progress.tip2', params) },
      { emoji: '🌟', text: t('progress.tip3', params) },
      { emoji: '📖', text: t('progress.tip4', params) },
      { emoji: '🦉', text: t('progress.tip5', params) },
      { emoji: '🛡️', text: t('progress.tip6', params) },
      { emoji: '💬', text: t('progress.tip7', params) },
    ];
  }, [t, childName]);

  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [tips.length]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-accent-ink font-bold uppercase tracking-widest text-xs sm:text-sm mb-2 block">
            {t('progress.kicker')}
          </span>
          <div className="text-7xl mb-6 inline-block animate-pulse">{stage.icon}</div>
          <p className="text-gray-500 font-medium text-sm md:text-base max-w-md mx-auto">
            {t('progress.description')}
          </p>
        </div>

        {/* Gradient progress bar */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8 mb-6">
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary-500 to-accent-500 h-4 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 font-bold text-center mt-3">{percent}%</p>

          {/* Tip card */}
          <div className="bg-primary-50 rounded-2xl p-5 border border-primary-100 mt-6 transition-opacity duration-300">
            <div className="flex items-start gap-3">
              <div className="text-3xl mt-0.5 shrink-0" aria-hidden>
                {tips[tipIndex]?.emoji}
              </div>
              <div>
                <p className="text-sm font-bold text-accent-ink uppercase tracking-wider mb-1.5">
                  {t('progress.tipHeading')}
                </p>
                <p className="text-gray-700 font-medium leading-relaxed text-lg">
                  {tips[tipIndex]?.text}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Failure screen shown when the pipeline reports `status === 'failed'`. */
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
        <h2 className="text-2xl font-black text-primary-900 mb-3">{t('progress.errorHeading')}</h2>
        <p className="text-base text-red-600 mb-6">{error}</p>
        <button
          onClick={onRetry}
          className="bg-accent-500 hover:bg-accent-600 text-on-accent font-bold px-8 py-3.5 rounded-2xl shadow-lg shadow-accent-500/30 transition"
        >
          {retryLabel}
        </button>
      </div>
    </div>
  );
}

/** Pause screen shown when the pipeline reports `status === 'paused'`. */
export function BookPausedScreen() {
  const { t } = useTranslation('book');
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full bg-white rounded-3xl border-2 border-yellow-200 p-8 md:p-10 text-center shadow-xl">
        <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          <i className="fa-solid fa-pause" />
        </div>
        <h2 className="text-2xl font-black text-primary-900 mb-3">{t('progress.pausedHeading')}</h2>
        <p className="text-sm text-gray-600">{t('progress.pausedDescription')}</p>
      </div>
    </div>
  );
}
