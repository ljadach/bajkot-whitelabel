import { Link } from 'react-router';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const STATUS_COLORS: Record<string, string> = {
  intake: 'bg-blue-100 text-blue-700',
  profiling: 'bg-blue-100 text-blue-700',
  story_planning: 'bg-indigo-100 text-indigo-700',
  story_writing: 'bg-indigo-100 text-indigo-700',
  psych_review: 'bg-purple-100 text-purple-700',
  art_direction: 'bg-violet-100 text-violet-700',
  character_design: 'bg-violet-100 text-violet-700',
  style_vote: 'bg-amber-100 text-amber-700',
  illustrating: 'bg-orange-100 text-orange-700',
  visual_qa: 'bg-orange-100 text-orange-700',
  composing_pdf: 'bg-teal-100 text-teal-700',
  final_qa: 'bg-teal-100 text-teal-700',
  delivering: 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-700',
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function AdminDashboard() {
  const stats = useQuery(api.admin.bookBatch.getPipelineStats);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Pipeline Dashboard</h1>
        <p className="text-neutral-500 text-sm mt-1">Real-time book pipeline overview</p>
      </div>

      {!stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-neutral-200 bg-white p-5 animate-pulse"
            >
              <div className="h-4 w-20 bg-neutral-100 rounded mb-3" />
              <div className="h-8 w-16 bg-neutral-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Total Orders
            </p>
            <p className="text-3xl font-bold text-neutral-900 mt-1">{stats.totalOrders}</p>
            {stats.avgCompletionTimeMs !== null && (
              <p className="text-xs text-neutral-400 mt-2">
                Avg. completion: {formatDuration(stats.avgCompletionTimeMs)}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Success Rate
            </p>
            <p
              className={`text-3xl font-bold mt-1 ${
                stats.successRate > 80
                  ? 'text-green-600'
                  : stats.successRate > 60
                    ? 'text-amber-600'
                    : 'text-red-600'
              }`}
            >
              {stats.successRate}%
            </p>
            <p className="text-xs text-neutral-400 mt-2">
              {stats.completedOrders} completed / {stats.completedOrders + stats.failedOrders}{' '}
              finished
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              In Progress
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-3xl font-bold text-neutral-900">{stats.inProgressOrders}</p>
              {stats.inProgressOrders > 0 && (
                <div className="w-4 h-4 spinner border-blue-500 border-t-transparent" />
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-2">
              {Object.entries(stats.ordersByStatus)
                .filter(([s]) => s !== 'completed' && s !== 'failed')
                .map(([s, c]) => `${s}: ${c}`)
                .slice(0, 3)
                .join(', ') || 'none'}
            </p>
          </div>

          <div
            className={`rounded-xl border p-5 ${
              stats.failedOrders > 0 ? 'border-red-200 bg-red-50' : 'border-neutral-200 bg-white'
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Failed</p>
            <p
              className={`text-3xl font-bold mt-1 ${stats.failedOrders > 0 ? 'text-red-600' : 'text-neutral-900'}`}
            >
              {stats.failedOrders}
            </p>
            {stats.failedOrders > 0 && (
              <Link
                to="/admin/batch"
                className="text-xs text-red-600 hover:text-red-500 mt-2 block"
              >
                View failed orders &rarr;
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">Recent Orders</h2>
          <Link
            to="/admin/batch"
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            View all &rarr;
          </Link>
        </div>

        {!stats ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 spinner" />
          </div>
        ) : stats.recentOrders.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-neutral-400">
            No orders yet. Launch a test order from the Book Batch page.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-400 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Child</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Agent</th>
                <th className="px-5 py-3 font-medium text-right">Created</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((order) => (
                <tr
                  key={order._id}
                  className="border-t border-neutral-100 hover:bg-neutral-50 transition-colors"
                >
                  <td className="px-5 py-3">
                    <Link
                      to="/admin/batch"
                      className="font-medium text-neutral-700 hover:text-neutral-900"
                    >
                      {order.childName}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status] ?? 'bg-neutral-100 text-neutral-600'}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-neutral-400">{order.currentAgent ?? '—'}</td>
                  <td className="px-5 py-3 text-neutral-400 text-right">
                    {timeAgo(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Link
          to="/admin/batch"
          className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-300 hover:shadow-sm transition-all"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-green-50 text-green-600">
            <svg
              className="w-4.5 h-4.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-700 group-hover:text-neutral-900">
              Launch Test Order
            </p>
            <p className="text-xs text-neutral-400">Quick launch from presets</p>
          </div>
        </Link>

        <Link
          to="/admin/batch"
          className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-300 hover:shadow-sm transition-all"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-purple-50 text-purple-600">
            <svg
              className="w-4.5 h-4.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-700 group-hover:text-neutral-900">
              Edit Prompts
            </p>
            <p className="text-xs text-neutral-400">Tune pipeline agent prompts</p>
          </div>
        </Link>

        <Link
          to="/admin/config"
          className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-300 hover:shadow-sm transition-all"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
            <svg
              className="w-4.5 h-4.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-700 group-hover:text-neutral-900">
              View Config
            </p>
            <p className="text-xs text-neutral-400">System configuration</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
