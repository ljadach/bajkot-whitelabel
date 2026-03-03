import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Id } from '../../../convex/_generated/dataModel';

interface Chapter {
  chapterNumber: number;
  status: 'not_started' | 'in_progress' | 'completed';
  timeSpentMinutes: number;
  exerciseCompleted: boolean;
  exerciseScore?: number;
}

interface Module {
  documentId: Id<'courseDocuments'>;
  pageTitle: string;
  pageIndex: number;
  status: 'not_started' | 'in_progress' | 'completed';
  chapters: Chapter[];
  totalTimeMinutes: number;
  completionPercent: number;
}

interface ModuleCardProps {
  module: Module;
}

export function ModuleCard({ module }: ModuleCardProps) {
  const { t } = useTranslation('dashboard');

  const statusConfig = {
    not_started: {
      bg: 'rgba(156,146,134,0.1)',
      text: '#9c9286',
    },
    in_progress: {
      bg: '#f7f3ea',
      text: '#8B6914',
    },
    completed: {
      bg: '#f0fdf4',
      text: '#16a34a',
    },
  };

  const statusLabels = {
    not_started: t('modules.status.notStarted'),
    in_progress: t('modules.status.inProgress'),
    completed: t('modules.status.completed'),
  };

  const status = statusConfig[module.status];

  return (
    <Link
      to={`/plan/${module.pageIndex}`}
      className="group relative block overflow-hidden rounded-2xl transition-all duration-300 no-underline cursor-pointer"
      style={{
        background: '#ffffff',
        boxShadow: '0 2px 16px rgba(60,50,30,0.06)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.boxShadow = '0 8px 32px rgba(60,50,30,0.12)';
        el.style.transform = 'translateY(-4px)';
        el.style.borderColor = '#8B6914';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.boxShadow = '0 2px 16px rgba(60,50,30,0.06)';
        el.style.transform = 'translateY(0)';
        el.style.borderColor = 'transparent';
      }}
      onFocus={() => {}}
      onBlur={() => {}}
    >
      {/* Hover border overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-transparent transition-colors duration-300 group-hover:border-[#8B6914]/20" aria-hidden="true" />

      {/* Top progress bar */}
      <div className="h-1 w-full" style={{ backgroundColor: '#e8e2d9' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${module.completionPercent}%`,
            background: 'linear-gradient(90deg, #ff6b35, #f7931e)',
          }}
        />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9c9286' }}>
              {t('modules.moduleNumber', { number: module.pageIndex + 1 })}
            </span>
            <span
              className="px-2 py-0.5 text-[10px] font-semibold rounded-full"
              style={{
                backgroundColor: status.bg,
                color: status.text,
              }}
            >
              {statusLabels[module.status]}
            </span>
          </div>
          <h3 className="text-lg font-semibold leading-snug truncate" style={{ color: '#1c1816' }}>
            {module.pageTitle}
          </h3>
        </div>
        <div className="flex-shrink-0 ml-4">
          <CircularProgress percent={module.completionPercent} size={48} />
        </div>
      </div>

      {/* Chapters */}
      <div className="px-5 pb-1">
        {module.chapters.map((chapter) => (
          <ChapterRow key={chapter.chapterNumber} chapter={chapter} />
        ))}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between text-xs px-5 py-3 mt-1"
        style={{
          borderTop: '1px solid #f0ece5',
          color: '#9c9286',
        }}
      >
        <span>{module.totalTimeMinutes > 0 ? t('modules.timeSpent', { minutes: module.totalTimeMinutes }) : t('modules.noTimeLogged')}</span>
        <span>
          {t('modules.exercisesCount', {
            completed: module.chapters.filter((c) => c.exerciseCompleted).length,
            total: 3,
          })}
        </span>
      </div>
    </Link>
  );
}

// ============================================
// Chapter Row
// ============================================

interface ChapterRowProps {
  chapter: Chapter;
}

function ChapterRow({ chapter }: ChapterRowProps) {
  const { t } = useTranslation('dashboard');

  const statusIcon = {
    not_started: <div className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ borderColor: '#d8cfc3' }} />,
    in_progress: (
      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: '#8B6914' }}>
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8B6914' }} />
      </div>
    ),
    completed: (
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#8B6914' }}>
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    ),
  };

  return (
    <div className="flex items-center gap-3 py-1.5">
      {statusIcon[chapter.status]}
      <div className="flex-1 min-w-0">
        <span className="text-sm" style={{ color: '#3b3632' }}>
          {t('modules.chapterNumber', { number: chapter.chapterNumber })}
        </span>
      </div>
      {chapter.exerciseCompleted && (
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="#8B6914" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span className="text-xs font-medium" style={{ color: '#8B6914' }}>
            {chapter.exerciseScore}
          </span>
        </div>
      )}
      {chapter.timeSpentMinutes > 0 && (
        <span className="text-xs" style={{ color: '#9c9286' }}>
          {chapter.timeSpentMinutes}m
        </span>
      )}
    </div>
  );
}

// ============================================
// Circular Progress
// ============================================

interface CircularProgressProps {
  percent: number;
  size?: number;
}

function CircularProgress({ percent, size = 48 }: CircularProgressProps) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" stroke="#e8e2d9" />
        {/* Progress circle */}
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} fill="none" stroke="#8B6914" className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold" style={{ color: '#1c1816' }}>
          {percent}%
        </span>
      </div>
    </div>
  );
}
