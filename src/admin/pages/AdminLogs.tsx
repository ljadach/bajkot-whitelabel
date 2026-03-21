import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '...' : s;
}

export function AdminLogs() {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [expandedLog, setExpandedLog] = useState<Id<'llmLogs'> | null>(null);
  const [limit, setLimit] = useState(20);

  const users = useQuery(api.llmLogs.getAllLogUsers);
  const logs = useQuery(api.llmLogs.getLlmLogs, {
    limit,
    ...(selectedUser ? { clerkUserId: selectedUser } : {}),
  });
  const logDetail = useQuery(
    api.llmLogs.getLlmLogById,
    expandedLog ? { logId: expandedLog } : 'skip',
  );
  const deleteLogs = useMutation(api.llmLogs.deleteLlmLogsForUser);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">LLM Logs</h1>
        <p className="text-neutral-500 text-sm mt-1">Pipeline LLM call history</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-neutral-500">User:</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm bg-white"
          >
            <option value="">Current user</option>
            {users?.map((u) => (
              <option key={u.clerkUserId} value={u.clerkUserId}>
                {truncate(u.clerkUserId, 20)} ({u.logCount} logs)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-neutral-500">Limit:</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm bg-white"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        {selectedUser && (
          <button
            onClick={() => {
              if (confirm('Delete all logs for this user?')) {
                void deleteLogs({ clerkUserId: selectedUser });
              }
            }}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
          >
            Delete user logs
          </button>
        )}
      </div>

      {/* Logs table */}
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        {!logs ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 spinner" />
          </div>
        ) : logs.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-neutral-400">No logs found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-400 text-xs uppercase tracking-wider border-b border-neutral-100">
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log._id}
                  onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
                  className={`border-t border-neutral-50 cursor-pointer transition-colors ${
                    expandedLog === log._id ? 'bg-blue-50' : 'hover:bg-neutral-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-neutral-700">{log.action}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-neutral-500">{log.model}</span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {log.error ? (
                      <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        error
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        ok
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-400 text-right text-xs">
                    {timeAgo(log.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Expanded log detail */}
      {expandedLog && logDetail && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900">{logDetail.action}</h3>
            <button
              onClick={() => setExpandedLog(null)}
              className="text-xs text-neutral-400 hover:text-neutral-600"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs font-medium text-neutral-400 uppercase">Model</span>
              <p className="font-mono text-neutral-700">{logDetail.model}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-neutral-400 uppercase">Duration</span>
              <p className="text-neutral-700">
                {logDetail.durationMs ? `${(logDetail.durationMs / 1000).toFixed(2)}s` : '—'}
              </p>
            </div>
          </div>

          {logDetail.error && (
            <div>
              <span className="text-xs font-medium text-red-500 uppercase">Error</span>
              <pre className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 overflow-x-auto whitespace-pre-wrap">
                {logDetail.error}
              </pre>
            </div>
          )}

          <div>
            <span className="text-xs font-medium text-neutral-400 uppercase">System Prompt</span>
            <pre className="mt-1 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
              {logDetail.systemPrompt}
            </pre>
          </div>

          <div>
            <span className="text-xs font-medium text-neutral-400 uppercase">User Prompt</span>
            <pre className="mt-1 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
              {logDetail.userPrompt}
            </pre>
          </div>

          {logDetail.response && (
            <div>
              <span className="text-xs font-medium text-neutral-400 uppercase">Response</span>
              <pre className="mt-1 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                {logDetail.response}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
