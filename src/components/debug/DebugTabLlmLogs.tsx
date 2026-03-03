import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useUser } from '@clerk/clerk-react';
import { api } from '../../../convex/_generated/api';
import ReactMarkdown from 'react-markdown';

const MD_PROSE =
  'prose prose-xs max-w-none text-xs text-gray-800 [&_pre]:bg-gray-50 [&_pre]:text-[11px] [&_pre]:p-2 [&_pre]:rounded [&_pre]:border [&_pre]:border-gray-200 [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-xs [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0';

/** Keys whose string values contain Markdown worth rendering. */
const MARKDOWN_FIELDS = new Set(['content', 'report', 'feedback', 'justification']);

/**
 * Smart response renderer: parses JSON, pretty-prints metadata,
 * and renders Markdown-rich fields with ReactMarkdown.
 */
function ResponseView({ raw }: { raw: string }) {
  let parsed: Record<string, unknown> | null = null;
  try {
    const val = JSON.parse(raw);
    if (val && typeof val === 'object' && !Array.isArray(val)) parsed = val;
  } catch {
    // not JSON — render as-is
  }

  if (!parsed) {
    return (
      <div className={`${MD_PROSE} bg-green-50 border border-green-100 p-3 rounded-lg`}>
        <ReactMarkdown>{raw}</ReactMarkdown>
      </div>
    );
  }

  const mdEntries: [string, string][] = [];
  const rest: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === 'string' && MARKDOWN_FIELDS.has(k) && v.length > 80) {
      mdEntries.push([k, v]);
    } else {
      rest[k] = v;
    }
  }

  return (
    <div className="space-y-3">
      {/* Short / non-markdown fields as pretty JSON */}
      {Object.keys(rest).length > 0 && <pre className="whitespace-pre-wrap text-xs text-gray-800 bg-green-50 border border-green-100 p-3 rounded-lg">{JSON.stringify(rest, null, 2)}</pre>}
      {/* Markdown-rich fields rendered */}
      {mdEntries.map(([key, value]) => (
        <div key={key}>
          <div className="text-xs font-medium text-green-700 mb-1">{key}</div>
          <div className={`${MD_PROSE} bg-green-50 border border-green-100 p-3 rounded-lg overflow-auto max-h-[60vh]`}>
            <ReactMarkdown>{value}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DebugTabLlmLogs() {
  const { user } = useUser();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteLogs = useMutation(api.llmLogs.deleteLlmLogsForUser);
  const allUsers = useQuery(api.llmLogs.getAllLogUsers, {});
  const logs = useQuery(api.llmLogs.getLlmLogs, {
    limit: 20,
    clerkUserId: selectedUserId ?? undefined,
  });
  const selectedLog = logs?.find((l) => l._id === selectedLogId);
  const currentUserId = user?.id;
  const isViewingOther = selectedUserId && selectedUserId !== currentUserId;

  if (!logs) {
    return <div className="text-gray-500 p-4">Loading logs...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="space-y-4 text-sm">
        <div className="rounded-lg border border-gray-200 p-6 text-center text-gray-500">No LLM calls recorded yet. Start a chat session to see logs here.</div>
      </div>
    );
  }

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId === currentUserId ? null : userId);
    setShowUserSwitcher(false);
    setSelectedLogId(null);
  };

  return (
    <div className="space-y-4 text-sm">
      {/* User Switcher */}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowUserSwitcher(!showUserSwitcher)} className={`rounded px-2 py-1 text-xs font-medium transition-colors ${isViewingOther ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          {isViewingOther ? `Viewing: ${selectedUserId?.slice(0, 12)}...` : 'Switch User'}
        </button>
        {isViewingOther && (
          <button
            onClick={() => {
              setSelectedUserId(null);
              setSelectedLogId(null);
            }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Back to my logs
          </button>
        )}
      </div>

      {showUserSwitcher && allUsers && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="text-xs font-medium text-gray-700 mb-2">Select user ({allUsers.length} users with logs)</div>
          <select value={selectedUserId || currentUserId || ''} onChange={(e) => handleUserSelect(e.target.value)} className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs">
            {allUsers.map((u) => (
              <option key={u.clerkUserId} value={u.clerkUserId}>
                {u.clerkUserId === currentUserId ? '(me) ' : ''}
                {u.clerkUserId.slice(0, 20)}... ({u.logCount} logs)
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">Showing last {logs.length} LLM calls (newest first)</div>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="rounded px-2 py-0.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
              Delete Logs
            </button>
          ) : (
            <span className="flex items-center gap-1">
              <span className="text-xs text-red-600">Delete {isViewingOther ? "this user's" : 'my'} logs?</span>
              <button
                onClick={() => {
                  void deleteLogs({ clerkUserId: selectedUserId ?? undefined }).then(() => {
                    setConfirmDelete(false);
                    setSelectedLogId(null);
                  });
                }}
                className="rounded px-2 py-0.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Yes
              </button>
              <button onClick={() => setConfirmDelete(false)} className="rounded px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                No
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log._id} onClick={() => setSelectedLogId(log._id)} className={`cursor-pointer rounded-lg border p-3 transition-colors hover:bg-gray-50 ${selectedLogId === log._id ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${log.error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{log.action}</span>
                {log.webSearchUsed && (
                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700" title="Web search used">
                    web
                  </span>
                )}
                {log.reasoningUsed && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700" title="Reasoning enabled">
                    reason
                  </span>
                )}
                <span className="text-xs text-gray-500">{log.model}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {log.durationMs && <span>{log.durationMs}ms</span>}
                <span>{formatTimestamp(log.timestamp)}</span>
              </div>
            </div>
            {log.error && <div className="mt-1 text-xs text-red-600 truncate">Error: {log.error}</div>}
          </div>
        ))}
      </div>

      {/* Selected Log Detail Modal */}
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
    action: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    response?: string;
    error?: string;
    durationMs?: number;
    timestamp: number;
    webSearchUsed?: boolean;
    webSearchSources?: string[];
    reasoningUsed?: boolean;
  };
  onClose: () => void;
}) {
  const [activeSection, setActiveSection] = useState<'prompt' | 'response' | 'sources'>('response');

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.warn('Clipboard copy failed', e);
    }
  };

  const fullPrompt = `${log.systemPrompt}\n\n---\n\n${log.userPrompt}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-xl border border-gray-200 bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className={`rounded px-2 py-1 text-xs font-medium ${log.error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{log.action}</span>
            <span className="text-sm text-gray-500">{log.model}</span>
            {log.durationMs && <span className="text-xs text-gray-400">{log.durationMs}ms</span>}
            <span className="text-xs text-gray-400">{formatTimestamp(log.timestamp)}</span>
          </div>
          <button onClick={onClose} className="rounded-md bg-gray-900 px-3 py-1 text-xs text-white hover:bg-black">
            Close
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 border-b border-gray-200 px-4">
          <button onClick={() => setActiveSection('prompt')} className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${activeSection === 'prompt' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
            Prompt ({log.systemPrompt.length + log.userPrompt.length} chars)
          </button>
          <button onClick={() => setActiveSection('response')} className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${activeSection === 'response' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
            Response {log.response ? `(${log.response.length} chars)` : log.error ? '(Error)' : '(Empty)'}
          </button>
          {log.webSearchUsed && (
            <button onClick={() => setActiveSection('sources')} className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${activeSection === 'sources' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}>
              Sources {log.webSearchSources ? `(${log.webSearchSources.length})` : '(0)'}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeSection === 'prompt' && (
            <div>
              <div className="flex justify-end mb-2">
                <button onClick={() => void copyToClipboard(fullPrompt)} className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50">
                  Copy All
                </button>
              </div>
              <div className="space-y-3">
                {/* System Prompt */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-purple-700">System Prompt</span>
                    <button onClick={() => void copyToClipboard(log.systemPrompt)} className="text-xs text-gray-400 hover:text-gray-600">
                      copy
                    </button>
                  </div>
                  <div className={`${MD_PROSE} bg-purple-50 border border-purple-100 p-3 rounded-lg overflow-auto max-h-[60vh]`}>
                    <ReactMarkdown>{log.systemPrompt}</ReactMarkdown>
                  </div>
                </div>
                {/* User Prompt */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-blue-700">User Prompt</span>
                    <button onClick={() => void copyToClipboard(log.userPrompt)} className="text-xs text-gray-400 hover:text-gray-600">
                      copy
                    </button>
                  </div>
                  <div className={`${MD_PROSE} bg-blue-50 border border-blue-100 p-3 rounded-lg overflow-auto max-h-[60vh]`}>
                    <ReactMarkdown>{log.userPrompt}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeSection === 'response' && (
            <div>
              {log.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-red-700 font-medium text-xs mb-1">Error</div>
                  <pre className="whitespace-pre-wrap text-xs text-red-600">{log.error}</pre>
                </div>
              ) : log.response ? (
                <div>
                  <div className="flex justify-end mb-2">
                    <button onClick={() => void copyToClipboard(log.response || '')} className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50">
                      Copy
                    </button>
                  </div>
                  <ResponseView raw={log.response} />
                </div>
              ) : (
                <div className="text-gray-500 text-xs">No response recorded</div>
              )}
            </div>
          )}
          {activeSection === 'sources' && (
            <div>
              {log.webSearchSources && log.webSearchSources.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-indigo-700 mb-2">Web Search Sources ({log.webSearchSources.length})</div>
                  {log.webSearchSources.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-600 hover:text-blue-800 hover:underline truncate bg-indigo-50 border border-indigo-100 rounded px-3 py-2">
                      {url}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-xs">Web search was used but no sources were captured.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
