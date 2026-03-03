import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

type LogLevel = 'log' | 'warn' | 'error';

export function DebugTabBackendLogs() {
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const logs = useQuery(api.backendLogs.getBackendLogs, levelFilter === 'all' ? { limit: 50 } : { limit: 50, level: levelFilter });
  const sources = useQuery(api.backendLogs.getSources, {});

  const selectedLog = logs?.find((l) => l._id === selectedLogId);

  if (!logs) {
    return <div className="text-gray-500 p-4">Loading logs...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="space-y-4 text-sm">
        <div className="rounded-lg border border-gray-200 p-6 text-center text-gray-500">No backend logs recorded yet. Logs will appear here as backend actions run.</div>
      </div>
    );
  }

  const levelColors: Record<LogLevel, { bg: string; text: string; border: string }> = {
    log: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
    warn: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    error: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  };

  return (
    <div className="space-y-4 text-sm">
      {/* Filters */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'all')} className="rounded border border-gray-300 bg-white px-2 py-1.5 text-xs">
            <option value="all">All levels</option>
            <option value="log">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
          <span className="text-xs text-gray-500">
            {logs.length} logs{sources && sources.length > 0 && ` from ${sources.length} sources`}
          </span>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-1 font-mono">
        {logs.map((log) => {
          const colors = levelColors[log.level];
          return (
            <div key={log._id} onClick={() => setSelectedLogId(log._id)} className={`cursor-pointer rounded border p-2 transition-colors hover:bg-gray-50 ${selectedLogId === log._id ? 'border-blue-400 bg-blue-50' : colors.border}`}>
              <div className="flex items-start gap-2">
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>{log.level === 'log' ? 'INFO' : log.level.toUpperCase()}</span>
                <span className="text-xs text-purple-600 font-medium">[{log.source}]</span>
                <span className="flex-1 text-xs text-gray-800 truncate">{log.message}</span>
                <span className="text-xs text-gray-400 shrink-0">{formatTimestamp(log.timestamp)}</span>
              </div>
              {log.data && (
                <div className="mt-1 ml-16 text-xs text-gray-500 truncate">
                  {log.data.slice(0, 100)}
                  {log.data.length > 100 ? '...' : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLogId(null)} />}
    </div>
  );
}

function LogDetailModal({
  log,
  onClose,
}: {
  log: {
    _id: string;
    level: 'log' | 'warn' | 'error';
    source: string;
    message: string;
    data?: string;
    timestamp: number;
  };
  onClose: () => void;
}) {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.warn('Clipboard copy failed', e);
    }
  };

  const levelColors: Record<string, string> = {
    log: 'bg-gray-100 text-gray-700',
    warn: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
  };

  let parsedData: unknown = null;
  if (log.data) {
    try {
      parsedData = JSON.parse(log.data);
    } catch {
      parsedData = log.data;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl max-h-[80vh] flex flex-col rounded-xl border border-gray-200 bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className={`rounded px-2 py-1 text-xs font-medium ${levelColors[log.level]}`}>{log.level === 'log' ? 'INFO' : log.level.toUpperCase()}</span>
            <span className="text-sm font-medium text-purple-600">[{log.source}]</span>
            <span className="text-xs text-gray-400">{formatTimestamp(log.timestamp)}</span>
          </div>
          <button onClick={onClose} className="rounded-md bg-gray-900 px-3 py-1 text-xs text-white hover:bg-black">
            Close
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700">Message</span>
              <button onClick={() => void copyToClipboard(log.message)} className="text-xs text-gray-400 hover:text-gray-600">
                copy
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 border border-gray-200 p-3 rounded-lg font-mono">{log.message}</pre>
          </div>

          {/* Data */}
          {parsedData && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">Data</span>
                <button onClick={() => void copyToClipboard(log.data || '')} className="text-xs text-gray-400 hover:text-gray-600">
                  copy
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-xs text-gray-800 bg-blue-50 border border-blue-100 p-3 rounded-lg font-mono">{typeof parsedData === 'string' ? parsedData : JSON.stringify(parsedData, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
