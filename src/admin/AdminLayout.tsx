import { Suspense } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminConfig } from './pages/AdminConfig';
import { VideoList } from './pages/VideoList';
import { SegmentEditor } from './pages/SegmentEditor';
import { CorpusEditor } from './pages/CorpusEditor';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/admin/config', label: 'Config', icon: 'settings' },
  { to: '/admin/videos', label: 'Videos', icon: 'film' },
  { to: '/admin/segments', label: 'Segments', icon: 'scissors' },
  { to: '/admin/corpus', label: 'Corpus', icon: 'book' },
];

function NavIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'grid':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
          />
        </svg>
      );
    case 'settings':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'film':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25z" />
        </svg>
      );
    case 'scissors':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m7.848 8.25 1.536.887M7.848 8.25a3 3 0 1 1-5.196-3 3 3 0 0 1 5.196 3zm1.536.887a2.165 2.165 0 0 1 1.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 1 1-5.196 3 3 3 0 0 1 5.196-3zm1.536-.887a2.165 2.165 0 0 0 1.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863 2.077-1.199m0-3.328a4.323 4.323 0 0 1 2.068-1.379l5.325-1.628a4.5 4.5 0 0 1 2.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.33 4.33 0 0 0 10.607 12m3.736 0 7.794 4.5-.802.215a4.5 4.5 0 0 1-2.48-.043l-5.326-1.629a4.324 4.324 0 0 1-2.068-1.379M14.343 12l-2.882 1.664"
          />
        </svg>
      );
    case 'book':
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function AdminLayout() {
  const isAdminQuery = useQuery(api.auth.isAdmin);
  const videos = useQuery(api.admin.videos.list);

  if (isAdminQuery === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-6 h-6 spinner" />
      </div>
    );
  }

  if (!isAdminQuery) {
    return <Navigate to="/dashboard" replace />;
  }

  const getBadge = (path: string): { count: number; color: string } | null => {
    if (!videos) return null;
    if (path === '/admin/videos') {
      const failed = videos.filter((v) => v.status === 'failed').length;
      if (failed > 0) return { count: failed, color: 'bg-red-500 text-white' };
      const processing = videos.filter((v) => v.status === 'processing').length;
      if (processing > 0) return { count: processing, color: 'bg-amber-500 text-white' };
    }
    return null;
  };

  return (
    <div className="flex h-full">
      <nav className="w-52 bg-white border-r border-neutral-200 flex flex-col py-5 px-3 shrink-0">
        <div className="px-3 mb-6">
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Admin Pipeline</span>
        </div>
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const badge = getBadge(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}
              >
                <NavIcon icon={item.icon} />
                <span className="flex-1">{item.label}</span>
                {badge && <span className={`text-[10px] font-bold min-w-[18px] text-center px-1 py-0.5 rounded-full leading-none ${badge.color}`}>{badge.count}</span>}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="flex-1 overflow-auto bg-neutral-50/50">
        <div className="p-8">
          <Suspense
            fallback={
              <div className="flex justify-center items-center min-h-[200px]">
                <div className="w-6 h-6 spinner" />
              </div>
            }
          >
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="config" element={<AdminConfig />} />
              <Route path="videos" element={<VideoList />} />
              <Route path="segments" element={<SegmentEditor />} />
              <Route path="corpus" element={<CorpusEditor />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
