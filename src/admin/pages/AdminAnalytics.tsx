import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { timeAgo } from '../../lib/formatTime';

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

const SINCE_OPTIONS = [
  { label: 'Last hour', hours: 1 },
  { label: 'Last 24h', hours: 24 },
  { label: 'Last 7 days', hours: 24 * 7 },
  { label: 'Last 30 days', hours: 24 * 30 },
];

export function AdminAnalytics() {
  const [pathPrefix, setPathPrefix] = useState('');
  const [excludeBots, setExcludeBots] = useState(true);
  const [sinceHours, setSinceHours] = useState(24);
  const [limit, setLimit] = useState(200);

  const sinceMs = useMemo(() => Date.now() - sinceHours * 3600_000, [sinceHours]);

  const views = useQuery(api.analytics.recentViews, {
    limit,
    excludeBots,
    sinceMs,
    pathPrefix: pathPrefix || undefined,
  });

  const summary = useQuery(api.analytics.summary, {
    sinceMs,
    excludeBots,
    pathPrefix: pathPrefix || undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Analytics</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Server-side page views (Vercel edge → Convex). Raw IP, manual purge.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-neutral-500">Window:</label>
          <select
            value={sinceHours}
            onChange={(e) => setSinceHours(Number(e.target.value))}
            className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm bg-white"
          >
            {SINCE_OPTIONS.map((o) => (
              <option key={o.hours} value={o.hours}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-neutral-500">Path prefix:</label>
          <input
            type="text"
            value={pathPrefix}
            onChange={(e) => setPathPrefix(e.target.value)}
            placeholder="/problem/"
            className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm bg-white w-48"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-neutral-500">Limit:</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm bg-white"
          >
            <option value={50}>50</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
          <input
            type="checkbox"
            checked={excludeBots}
            onChange={(e) => setExcludeBots(e.target.checked)}
            className="rounded border-neutral-300"
          />
          Hide bots
        </label>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="Total views" value={summary?.totalViews ?? '—'} />
        <SummaryCard label="Unique IPs" value={summary?.uniqueIps ?? '—'} />
        <ListCard
          label="Top paths"
          rows={(summary?.topPaths ?? []).map((p) => ({ key: p.path, count: p.count }))}
        />
        <ListCard
          label="Top countries"
          rows={(summary?.topCountries ?? []).map((c) => ({ key: c.country, count: c.count }))}
        />
      </div>

      {/* Views table */}
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        {!views ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 spinner" />
          </div>
        ) : views.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-neutral-400">
            No page views in this window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-400 text-xs uppercase tracking-wider border-b border-neutral-100">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium">Country</th>
                  <th className="px-4 py-3 font-medium">Path</th>
                  <th className="px-4 py-3 font-medium">Referer</th>
                  <th className="px-4 py-3 font-medium">User-Agent</th>
                </tr>
              </thead>
              <tbody>
                {views.map((v) => (
                  <tr key={v._id} className="border-t border-neutral-50 hover:bg-neutral-50">
                    <td
                      className="px-4 py-2 text-neutral-500 text-xs whitespace-nowrap"
                      title={new Date(v.timestamp).toISOString()}
                    >
                      {timeAgo(v.timestamp)}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-neutral-700 whitespace-nowrap">
                      {v.ip || '—'}
                    </td>
                    <td className="px-4 py-2 text-neutral-500 text-xs">{v.country ?? '—'}</td>
                    <td className="px-4 py-2 text-neutral-800 text-xs">
                      <span className="font-medium">{v.path}</span>
                      {v.isBot && (
                        <span className="ml-2 inline-block rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          bot
                        </span>
                      )}
                      {v.accessTokenHash && (
                        <span className="ml-2 inline-block rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                          token
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-2 text-neutral-500 text-xs max-w-xs truncate"
                      title={v.referer ?? ''}
                    >
                      {v.referer ? truncate(v.referer, 50) : '—'}
                    </td>
                    <td
                      className="px-4 py-2 text-neutral-400 text-xs max-w-md truncate"
                      title={v.userAgent}
                    >
                      {truncate(v.userAgent, 60)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
        {label}
      </div>
      <div className="text-2xl font-bold text-neutral-900 mt-1">{value}</div>
    </div>
  );
}

function ListCard({ label, rows }: { label: string; rows: { key: string; count: number }[] }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium mb-2">
        {label}
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-neutral-400">—</div>
      ) : (
        <ul className="space-y-1">
          {rows.slice(0, 5).map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-neutral-700 truncate" title={r.key}>
                {r.key}
              </span>
              <span className="font-mono text-neutral-500 shrink-0">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
