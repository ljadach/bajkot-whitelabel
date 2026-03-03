import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { ProgressChart } from './ProgressChart';
import { ModuleCard } from './ModuleCard';

// Steps that indicate the user has reached the learning phase
const LEARNING_STEPS = ['plan', 'coursePreview', 'complete'];

// Map step to path for redirection
const STEP_TO_PATH: Record<string, string> = {
  welcome: '/',
  chat: '/',
  verification: '/verification',
  summary: '/summary',
  assessment: '/summary',
  plan: '/plan',
  coursePreview: '/plan',
  complete: '/complete',
};

export function ProgressDashboard() {
  const { t } = useTranslation('dashboard');
  const tCommon = useTranslation('common').t;
  const navigate = useNavigate();
  const profile = useQuery(api.profiles.getCurrentProfile);
  const stats = useQuery(api.progress.getDashboardStats);
  const modules = useQuery(api.progress.getModuleProgress);
  const activity = useQuery(api.progress.getActivityOverTime, { days: 30 });

  // Redirect to appropriate step if user hasn't reached learning phase
  useEffect(() => {
    if (profile === undefined) return; // Still loading
    if (profile === null) {
      // No profile - redirect to start
      void navigate('/', { replace: true });
      return;
    }

    const currentStep = profile.currentStep || 'chat';
    if (!LEARNING_STEPS.includes(currentStep)) {
      // User hasn't reached learning phase - redirect to their current step
      const path = STEP_TO_PATH[currentStep] || '/';
      void navigate(path, { replace: true });
    }
  }, [profile, navigate]);

  // Show loading while checking profile
  if (profile === undefined || stats === undefined || modules === undefined) {
    return (
      <div className="min-h-[calc(100vh-56px)]" style={{ background: '#faf8f5' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="w-6 h-6 spinner" />
          </div>
        </div>
      </div>
    );
  }

  // Check if user should be redirected (profile loaded but not in learning phase)
  if (profile === null || !LEARNING_STEPS.includes(profile.currentStep || 'chat')) {
    return (
      <div className="min-h-[calc(100vh-56px)]" style={{ background: '#faf8f5' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="w-6 h-6 spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (stats === null) {
    return (
      <div className="min-h-[calc(100vh-56px)]" style={{ background: '#faf8f5' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold mb-2" style={{ color: '#1c1816' }}>
              {t('empty.title')}
            </h2>
            <p className="mb-6" style={{ color: '#9c9286' }}>
              {t('empty.description')}
            </p>
            <Link to="/plan" className="btn-accent inline-flex items-center gap-2 px-5 py-2.5">
              {t('empty.button')}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)]" style={{ background: '#faf8f5' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-2">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-2 dashboard-animate-in">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1c1816' }}>
              {t('title')}
            </h1>
            <p className="text-base mt-2" style={{ color: '#9c9286' }}>
              {t('subtitle')}
            </p>
          </div>
          <Link to="/plan" className="btn-accent inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium">
            {t('continueButton')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        {/* Brass decorative line */}
        <div className="mb-10 dashboard-animate-in dashboard-delay-1">
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, #8B6914 0%, #d4b85c 50%, transparent 100%)', opacity: 0.3 }} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            label={t('stats.totalPoints')}
            value={stats.totalPoints}
            icon={
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            }
            color="gold"
            delay={2}
          />
          <StatCard
            label={t('stats.exercisesDone')}
            value={stats.exercisesCompleted}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="teal"
            delay={3}
          />
          <StatCard
            label={t('stats.chaptersDone')}
            value={`${stats.chaptersCompleted}/${stats.totalChapters}`}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            }
            color="indigo"
            delay={4}
          />
          <StatCard
            label={t('stats.dayStreak')}
            value={stats.streakDays}
            sublabel={t('stats.best', { count: stats.longestStreak })}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
            }
            color="orange"
            delay={5}
          />
        </div>

        {/* Activity Chart */}
        {activity && activity.length > 0 && (
          <div className="dashboard-card rounded-2xl p-6 mb-10 dashboard-animate-in dashboard-delay-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#1c1816' }}>
              {t('activity.title')}
            </h2>
            <ProgressChart data={activity} />
          </div>
        )}

        {/* Modules */}
        {modules.length > 0 && (
          <div className="dashboard-animate-in dashboard-delay-7">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#1c1816' }}>
              <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#8B6914' }} />
              {t('modules.title')}
            </h2>
            <div className="grid gap-5 md:grid-cols-2">
              {modules.map((module) => (
                <ModuleCard key={module.documentId} module={module} />
              ))}
            </div>
          </div>
        )}

        {modules.length === 0 && (
          <div className="dashboard-card rounded-2xl p-8 text-center dashboard-animate-in dashboard-delay-7">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#f0ece5' }}>
              <svg className="w-6 h-6" style={{ color: '#9c9286' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
            <h3 className="text-base font-medium mb-1" style={{ color: '#1c1816' }}>
              {t('modules.empty.title')}
            </h3>
            <p className="text-sm" style={{ color: '#9c9286' }}>
              {t('modules.empty.description')}
            </p>
          </div>
        )}

        {/* Time stats */}
        {stats.totalTimeMinutes > 0 && (
          <div className="mt-8 p-4 rounded-xl text-center dashboard-animate-in dashboard-delay-8" style={{ background: '#f0ece5' }}>
            <p className="text-sm" style={{ color: '#6b6560' }}>
              {t('footer.totalTime')}{' '}
              <span className="font-medium" style={{ color: '#1c1816' }}>
                {formatTime(stats.totalTimeMinutes)}
              </span>
              {stats.lastActivityAt && (
                <span className="ml-2" style={{ color: '#9c9286' }}>
                  | {t('footer.lastActive')} {formatRelativeTime(stats.lastActivityAt, tCommon)}
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ReactNode;
  color: 'gold' | 'teal' | 'indigo' | 'orange';
  delay: number;
}

const statColors = {
  gold: {
    accent: 'stat-accent-gold',
    iconBg: 'rgba(139,105,20,0.1)',
    iconColor: '#8B6914',
    gradient: 'linear-gradient(90deg, rgba(139,105,20,0.04) 0%, transparent 100%)',
  },
  teal: {
    accent: 'stat-accent-teal',
    iconBg: 'rgba(13,148,136,0.1)',
    iconColor: '#0d9488',
    gradient: 'linear-gradient(90deg, rgba(13,148,136,0.04) 0%, transparent 100%)',
  },
  indigo: {
    accent: 'stat-accent-indigo',
    iconBg: 'rgba(99,102,241,0.1)',
    iconColor: '#6366f1',
    gradient: 'linear-gradient(90deg, rgba(99,102,241,0.04) 0%, transparent 100%)',
  },
  orange: {
    accent: 'stat-accent-orange',
    iconBg: 'rgba(255,107,53,0.1)',
    iconColor: '#ff6b35',
    gradient: 'linear-gradient(90deg, rgba(255,107,53,0.04) 0%, transparent 100%)',
  },
};

function StatCard({ label, value, sublabel, icon, color, delay }: StatCardProps) {
  const c = statColors[color];
  return (
    <div
      className={`rounded-xl p-5 ${c.accent} dashboard-animate-in dashboard-delay-${delay}`}
      style={{
        background: c.gradient,
        boxShadow: '0 2px 12px rgba(60,50,30,0.06)',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.iconBg, color: c.iconColor }}>
          {icon}
        </div>
        <span className="text-sm font-medium uppercase tracking-wide" style={{ color: '#6b6560', letterSpacing: '0.04em' }}>
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tracking-tight" style={{ color: '#1c1816' }}>
          {value}
        </span>
        {sublabel && (
          <span className="text-xs" style={{ color: '#9c9286' }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================

function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatRelativeTime(timestamp: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return t('time.daysAgo', { count: days });
  if (hours > 0) return t('time.hoursAgo', { count: hours });
  if (minutes > 0) return t('time.minutesAgo', { count: minutes });
  return t('time.justNow');
}
