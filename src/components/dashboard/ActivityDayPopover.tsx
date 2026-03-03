import { useQuery } from 'convex/react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';

const TOOL_IDS = new Set(['probe', 'contrapositor', 'conceptRadar', 'skeletonKeyAuto', 'skeletonKeyManual', 'tomorrow', 'reflectionGate', 'glossator']);

interface ActivityDetail {
  activityType: string;
  pointsEarned: number;
  label: string;
  sublabel?: string;
  pageIndex?: number;
  chapterNumber?: number;
}

interface ActivityDayPopoverProps {
  date: string; // YYYY-MM-DD
  totalPoints: number;
  locale: string;
  onClose: () => void;
}

export function ActivityDayPopover({ date, totalPoints, locale }: ActivityDayPopoverProps) {
  const { t } = useTranslation('dashboard');
  const details = useQuery(api.progress.getDayActivityDetails, { date });

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-white rounded-lg shadow-lg border border-neutral-200 w-64 text-left animate-fadeIn" style={{ fontSize: '13px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: '#e8e2d9' }}>
        <span className="font-semibold" style={{ color: '#1c1816' }}>
          {formattedDate}
        </span>
        {totalPoints > 0 && (
          <span className="flex items-center gap-1 font-semibold" style={{ color: '#f7931e' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {totalPoints} {t('activity.popover.totalPoints')}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        {details === undefined ? (
          <div className="flex items-center justify-center py-3" style={{ color: '#9c9286' }}>
            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t('activity.popover.loading')}
          </div>
        ) : details.length === 0 ? (
          <>
            <div className="py-2 text-center text-xs" style={{ color: '#9c9286' }}>
              {t('activity.popover.exploringOnly')}
            </div>
            <div className="mt-2 pt-2 border-t" style={{ borderColor: '#e8e2d9' }}>
              <Link
                to="/plan"
                className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#fff7ed',
                  color: '#f7931e',
                  border: '1px solid #fed7aa',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffedd5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff7ed';
                }}
              >
                {t('activity.popover.continue')} →
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1 overflow-y-auto" style={{ maxHeight: '200px' }}>
              {details.map((item, i) => (
                <ActivityItem key={i} item={item} t={t} />
              ))}
            </div>

            {/* CTA */}
            <div className="mt-3 pt-2 border-t" style={{ borderColor: '#e8e2d9' }}>
              <Link
                to="/plan"
                className="block w-full text-center py-1.5 px-3 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#fff7ed',
                  color: '#f7931e',
                  border: '1px solid #fed7aa',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffedd5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff7ed';
                }}
              >
                {t('activity.popover.continue')} →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ item, t }: { item: ActivityDetail; t: (key: string) => string }) {
  const isToolExercise = item.activityType === 'exercise_completed' && !item.sublabel && TOOL_IDS.has(item.label.toLowerCase().replace(/\s/g, ''));
  const { icon, iconColor } = getActivityIcon(item.activityType, isToolExercise);
  const typeLabel = isToolExercise ? t('activity.types.tool_exercise') : t(`activity.types.${item.activityType}`);

  // Build link: /plan/{pageIndex}/{chapterNumber} if we have nav info
  const linkTo = item.pageIndex !== undefined && item.chapterNumber !== undefined ? `/plan/${item.pageIndex}/${item.chapterNumber}` : item.pageIndex !== undefined ? `/plan/${item.pageIndex}` : null;

  const content = (
    <div className="flex items-start gap-2 flex-1 min-w-0">
      <div className="mt-0.5 flex-shrink-0" style={{ color: iconColor }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate" style={{ color: '#1c1816' }}>
          {item.label}
        </div>
        {item.sublabel ? (
          <div className="text-xs truncate" style={{ color: '#6b6560' }}>
            {item.sublabel}
          </div>
        ) : (
          <div className="text-xs" style={{ color: '#9c9286' }}>
            {typeLabel}
          </div>
        )}
      </div>
      {item.pointsEarned > 0 && (
        <span className="flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded" style={{ color: '#f7931e', backgroundColor: '#fff7ed' }}>
          {item.pointsEarned}
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="flex items-start rounded-md px-1 py-1 -mx-1 transition-colors hover:bg-neutral-50">
        {content}
      </Link>
    );
  }

  return <div className="flex items-start px-1 py-1 -mx-1">{content}</div>;
}

function getActivityIcon(activityType: string, isToolExercise: boolean): { icon: JSX.Element; iconColor: string } {
  // Tool exercise: wrench icon
  if (activityType === 'exercise_completed' && isToolExercise) {
    return {
      iconColor: '#8b5cf6',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
        </svg>
      ),
    };
  }

  switch (activityType) {
    // Completed chapter: book with checkmark
    case 'chapter_completed':
      return {
        iconColor: '#22c55e',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        ),
      };
    // Exercise completed: pencil
    case 'exercise_completed':
      return {
        iconColor: '#f7931e',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        ),
      };
    default:
      return {
        iconColor: '#9c9286',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
          </svg>
        ),
      };
  }
}
