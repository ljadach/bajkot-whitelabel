import { Link } from 'react-router';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useMemo } from 'react';

export function AdminDashboard() {
  const videos = useQuery(api.admin.videos.list);
  const allSegments = useQuery(api.admin.segments.listAll);
  const corpora = useQuery(api.admin.corpus.list);
  const configList = useQuery(api.admin.config.list);

  const stats = useMemo(() => {
    if (!videos || !allSegments || !corpora) return null;
    const activeCorpusId = configList?.find((c) => c.key === 'active_corpus_id')?.value;
    const activeCorpus = activeCorpusId ? corpora.find((c) => c._id === activeCorpusId) : null;
    return {
      totalVideos: videos.length,
      newVideos: videos.filter((v) => v.status === 'new').length,
      processingVideos: videos.filter((v) => v.status === 'processing').length,
      processedVideos: videos.filter((v) => v.status === 'processed').length,
      failedVideos: videos.filter((v) => v.status === 'failed').length,
      totalSegments: allSegments.length,
      enabledSegments: allSegments.filter((s) => s.enabled).length,
      disabledSegments: allSegments.filter((s) => !s.enabled).length,
      totalCorpora: corpora.length,
      activeCorpusName: activeCorpus ? `v${activeCorpus.version}` : 'None',
      activeCorpusSegments: activeCorpus?.segmentCount ?? 0,
      totalDuration: videos.reduce((sum, v) => sum + (v.durationSeconds ?? 0), 0),
    };
  }, [videos, allSegments, corpora, configList]);

  if (!stats) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Content Processing Pipeline</h1>
        <p className="text-neutral-500 text-sm mt-1">Video content processing overview and quick actions</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Videos"
          value={stats.totalVideos}
          sub={`${formatDuration(stats.totalDuration)} total`}
          detail={
            <div className="flex gap-2 mt-2">
              {stats.processedVideos > 0 && <MiniTag color="green">{stats.processedVideos} done</MiniTag>}
              {stats.processingVideos > 0 && <MiniTag color="amber">{stats.processingVideos} running</MiniTag>}
              {stats.failedVideos > 0 && <MiniTag color="red">{stats.failedVideos} failed</MiniTag>}
              {stats.newVideos > 0 && <MiniTag color="blue">{stats.newVideos} new</MiniTag>}
            </div>
          }
        />
        <KpiCard
          label="Segments"
          value={stats.totalSegments}
          sub={`${stats.enabledSegments} enabled`}
          detail={
            stats.disabledSegments > 0 ? (
              <div className="mt-2">
                <MiniTag color="neutral">{stats.disabledSegments} disabled</MiniTag>
              </div>
            ) : null
          }
        />
        <KpiCard label="Corpora" value={stats.totalCorpora} sub={stats.totalCorpora > 0 ? 'versions built' : 'none built yet'} />
        <KpiCard label="Active Corpus" value={stats.activeCorpusName} sub={stats.activeCorpusSegments > 0 ? `${stats.activeCorpusSegments} segments` : 'No corpus selected'} />
      </div>

      {/* Pipeline Flow */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 mb-8">
        <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-5">Pipeline Status</h2>
        <div className="flex items-center gap-0">
          <PipelineStep step={1} label="Sync" description="Google Drive" count={stats.totalVideos} countLabel="videos" status={stats.totalVideos > 0 ? 'done' : 'empty'} to="/admin/config" />
          <PipelineArrow />
          <PipelineStep
            step={2}
            label="Process"
            description="LLM Analysis"
            count={stats.processingVideos + stats.failedVideos + stats.newVideos}
            countLabel="pending"
            status={stats.failedVideos > 0 ? 'error' : stats.processingVideos > 0 ? 'active' : stats.newVideos > 0 ? 'waiting' : stats.processedVideos > 0 ? 'done' : 'empty'}
            to="/admin/videos"
          />
          <PipelineArrow />
          <PipelineStep step={3} label="Review" description="Segment Curation" count={stats.totalSegments} countLabel="segments" status={stats.totalSegments > 0 ? 'done' : 'empty'} to="/admin/segments" />
          <PipelineArrow />
          <PipelineStep step={4} label="Build" description="Knowledge Corpus" count={stats.totalCorpora} countLabel="versions" status={stats.activeCorpusName !== 'None' ? 'done' : stats.totalCorpora > 0 ? 'waiting' : 'empty'} to="/admin/corpus" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {MODULES.map((mod) => (
          <Link key={mod.to} to={mod.to} className="group flex items-start gap-3 p-4 bg-white border border-neutral-200 rounded-xl hover:border-neutral-300 hover:shadow-sm transition-all">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${mod.color}`}>{mod.icon}</div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-neutral-700">{mod.title}</h3>
              <p className="text-xs text-neutral-500 leading-relaxed mt-0.5">{mod.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, detail }: { label: string; value: string | number; sub: string; detail?: React.ReactNode }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5">
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">{label}</div>
      <div className="text-3xl font-bold text-neutral-900 tabular-nums">{value}</div>
      <div className="text-xs text-neutral-500 mt-1">{sub}</div>
      {detail}
    </div>
  );
}

function MiniTag({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
    neutral: 'bg-neutral-100 text-neutral-600',
  };
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${colors[color] ?? colors.neutral}`}>{children}</span>;
}

function PipelineStep({ step, label, description, count, countLabel, status, to }: { step: number; label: string; description: string; count: number; countLabel: string; status: 'done' | 'active' | 'waiting' | 'error' | 'empty'; to: string }) {
  const statusStyles: Record<string, { ring: string; bg: string; text: string; dot: string }> = {
    done: { ring: 'ring-green-200', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    active: { ring: 'ring-amber-200', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500 animate-pulse' },
    waiting: { ring: 'ring-blue-200', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    error: { ring: 'ring-red-200', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    empty: { ring: 'ring-neutral-100', bg: 'bg-neutral-50', text: 'text-neutral-400', dot: 'bg-neutral-300' },
  };
  const s = statusStyles[status];

  return (
    <Link to={to} className={`flex-1 p-4 rounded-xl ring-1 ${s.ring} ${s.bg} hover:ring-2 transition-all group`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${s.dot}`} />
        <span className="text-xs font-bold text-neutral-400">Step {step}</span>
      </div>
      <div className={`text-sm font-semibold ${s.text}`}>{label}</div>
      <div className="text-xs text-neutral-500 mt-0.5">{description}</div>
      <div className={`text-lg font-bold mt-2 tabular-nums ${s.text}`}>
        {count} <span className="text-xs font-normal text-neutral-400">{countLabel}</span>
      </div>
    </Link>
  );
}

function PipelineArrow() {
  return (
    <div className="flex items-center px-1 text-neutral-300 shrink-0">
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const MODULES = [
  {
    to: '/admin/config',
    title: 'Pipeline Config',
    description: 'Drive URL, model, processing params',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'bg-blue-50 text-blue-600',
  },
  {
    to: '/admin/videos',
    title: 'Video Library',
    description: 'Sync, process, track status',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25z" />
      </svg>
    ),
    color: 'bg-purple-50 text-purple-600',
  },
  {
    to: '/admin/segments',
    title: 'Segment Editor',
    description: 'Review, tag, toggle segments',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m7.848 8.25 1.536.887M7.848 8.25a3 3 0 1 1-5.196-3 3 3 0 0 1 5.196 3zm1.536.887a2.165 2.165 0 0 1 1.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 1 1-5.196 3 3 3 0 0 1 5.196-3zm1.536-.887a2.165 2.165 0 0 0 1.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863 2.077-1.199m0-3.328a4.323 4.323 0 0 1 2.068-1.379l5.325-1.628a4.5 4.5 0 0 1 2.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.33 4.33 0 0 0 10.607 12m3.736 0 7.794 4.5-.802.215a4.5 4.5 0 0 1-2.48-.043l-5.326-1.629a4.324 4.324 0 0 1-2.068-1.379M14.343 12l-2.882 1.664"
        />
      </svg>
    ),
    color: 'bg-amber-50 text-amber-600',
  },
  {
    to: '/admin/corpus',
    title: 'Knowledge Corpus',
    description: 'Merge segments, manage versions',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
        />
      </svg>
    ),
    color: 'bg-green-50 text-green-600',
  },
];
