import { useState, useRef, useCallback } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { useSearchParams } from 'react-router';
import { api } from '../../../convex/_generated/api';
import {
  validateBatchProfile,
  parseBatchJson,
  type BatchProfile,
} from '../../lib/bookBatchValidation';
import { PRECANNED_PROFILES } from '../../lib/bookTestProfiles';
import { PROBLEMS } from '../../lib/bookData';
import type { Id } from '../../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { OrderTimeline } from '../../components/book/OrderTimeline';
import { STATUS_COLORS } from '../statusColors';

type ValidationResult = { index: number; profile: BatchProfile; valid: boolean; errors: string[] };

type Tab = 'launch' | 'orders' | 'prompts';

const AGENT_LIST = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11'];

const ARTIFACT_FIELDS = [
  { key: 'orderData', label: 'Order Data (A0)' },
  { key: 'characterProfile', label: 'Character Profile (A1)' },
  { key: 'storyBlueprint', label: 'Story Blueprint (A2)' },
  { key: 'storyDraft', label: 'Story Draft (A3)' },
  { key: 'psychReview', label: 'Psych Review (A4)' },
  { key: 'illustrationPlan', label: 'Illustration Plan (A5)' },
  { key: 'visualQa', label: 'Visual QA (A8)' },
  { key: 'finalQa', label: 'Final QA (A10)' },
] as const;

// ════════════════════════════════════════════════════════════
// Helper: download a string as a file
// ════════════════════════════════════════════════════════════

function downloadJson(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ════════════════════════════════════════════════════════════
// Main component
// ════════════════════════════════════════════════════════════

export function BookBatch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const activeTab: Tab = urlTab === 'orders' || urlTab === 'prompts' ? urlTab : 'launch';

  const switchTab = (tab: Tab) =>
    setSearchParams(tab === 'launch' ? {} : { tab }, { replace: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">Book Lab</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Pipeline testing, monitoring i cyzelowanie promptów.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200">
        {(
          [
            ['launch', 'Launch'],
            ['orders', 'Orders'],
            ['prompts', 'Prompts'],
          ] as [Tab, string][]
        ).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'launch' && <LaunchTab />}
      {activeTab === 'orders' && <OrdersTab />}
      {activeTab === 'prompts' && <PromptsTab />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Launch Tab
// ════════════════════════════════════════════════════════════

function LaunchTab() {
  const batchCreate = useAction(api.admin.bookBatch.batchCreate);
  const [launching, setLaunching] = useState<string | null>(null);
  const [launchResult, setLaunchResult] = useState<string | null>(null);
  const [skipQaReviews, setSkipQaReviews] = useState(false);

  // Custom batch state
  const [jsonInput, setJsonInput] = useState('');
  const [validationResults, setValidationResults] = useState<ValidationResult[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ created: number; errors: string[] } | null>(
    null,
  );

  const handleLaunchOne = async (profile: BatchProfile) => {
    setLaunching(profile.childName);
    setLaunchResult(null);
    try {
      const order = skipQaReviews ? { ...profile, skipQaReviews: true } : profile;
      const result = await batchCreate({ orders: [order] });
      setLaunchResult(`${profile.childName}: ${result.created.length > 0 ? 'started' : 'failed'}`);
    } catch (err) {
      setLaunchResult(`${profile.childName}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLaunching(null);
    }
  };

  const handleLaunchAll = async () => {
    setLaunching('all');
    setLaunchResult(null);
    try {
      const orders = skipQaReviews
        ? PRECANNED_PROFILES.map((p) => ({ ...p, skipQaReviews: true as const }))
        : PRECANNED_PROFILES;
      const result = await batchCreate({ orders });
      setLaunchResult(`Started ${result.created.length}/${PRECANNED_PROFILES.length} orders`);
    } catch (err) {
      setLaunchResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLaunching(null);
    }
  };

  const handleValidate = () => {
    setCreateResult(null);
    const { profiles, parseError: pe } = parseBatchJson(jsonInput);
    if (pe) {
      setParseError(pe);
      setValidationResults(null);
      return;
    }
    setParseError(null);
    const results: ValidationResult[] = profiles.map((p, i) => {
      const { valid, errors } = validateBatchProfile(p);
      return { index: i, profile: p as BatchProfile, valid, errors };
    });
    setValidationResults(results);
  };

  const allValid = validationResults?.every((r) => r.valid) ?? false;
  const validCount = validationResults?.filter((r) => r.valid).length ?? 0;

  const handleCreate = async () => {
    if (!validationResults || !allValid) return;
    setIsCreating(true);
    setCreateResult(null);
    try {
      const profiles = validationResults.map((r) => r.profile);
      const result = await batchCreate({ orders: profiles });
      setCreateResult({ created: result.created.length, errors: result.errors });
      if (result.created.length > 0) {
        setJsonInput('');
        setValidationResults(null);
      }
    } catch (err) {
      setCreateResult({ created: 0, errors: [err instanceof Error ? err.message : String(err)] });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Fast Mode Toggle */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={skipQaReviews}
            onChange={(e) => setSkipQaReviews(e.target.checked)}
            className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
          />
          <span className="text-sm font-semibold text-amber-900">Fast Mode</span>
        </label>
        <span className="text-xs text-amber-700">
          Pomija recenzje QA (A4, A8, A10) — szybciej, bez weryfikacji jakości
        </span>
      </div>

      {/* Quick Launch */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400">
            Quick Launch
            {skipQaReviews && (
              <span className="ml-2 text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full normal-case tracking-normal">
                FAST
              </span>
            )}
          </h2>
          <button
            onClick={() => void handleLaunchAll()}
            disabled={!!launching}
            className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors disabled:opacity-40"
          >
            {launching === 'all'
              ? 'Starting...'
              : `Generuj wszystkie (${PRECANNED_PROFILES.length})`}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRECANNED_PROFILES.map((p) => {
            const problem = PROBLEMS[p.problemId as keyof typeof PROBLEMS];
            return (
              <div
                key={p.childName}
                className="rounded-lg border border-neutral-200 p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900">{p.childName}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      p.chosenStyle === 'B'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    Style {p.chosenStyle ?? 'A'}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 space-y-0.5">
                  <div>
                    {p.ageBracket} lat, {p.gender === 'girl' ? 'dziewczynka' : 'chlopiec'}
                  </div>
                  <div>{problem?.title_pl ?? p.problemId}</div>
                </div>
                <button
                  onClick={() => void handleLaunchOne(p)}
                  disabled={!!launching}
                  className="mt-auto rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 transition-colors disabled:opacity-40"
                >
                  {launching === p.childName ? 'Starting...' : 'Generuj'}
                </button>
              </div>
            );
          })}
        </div>

        {launchResult && (
          <div className="rounded-lg bg-neutral-50 px-4 py-2 text-sm text-neutral-700">
            {launchResult}
          </div>
        )}
      </div>

      {/* Custom Batch */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400">Custom Batch</h2>

        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder={
            '[\n  {\n    "childName": "Zosia",\n    "ageBracket": "3-5",\n    "gender": "girl",\n    "problemId": "fear_of_dark",\n    "hairColor": "blond",\n    "hairStyle": "dlugie_proste",\n    "eyeColor": "niebieskie",\n    "skinTone": "jasna",\n    "outfit": "sukienka_motyle",\n    "glasses": false,\n    "chosenStyle": "A"\n  }\n]'
          }
          rows={8}
          className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3 font-mono text-sm focus:border-neutral-500 focus:outline-none resize-y"
        />

        {parseError && (
          <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{parseError}</div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleValidate}
            disabled={!jsonInput.trim()}
            className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors disabled:opacity-40"
          >
            Waliduj
          </button>
          {validationResults && allValid && (
            <button
              onClick={() => void handleCreate()}
              disabled={isCreating}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Tworzenie...' : `Utwórz ${validCount} zamówień`}
            </button>
          )}
        </div>

        {validationResults && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-neutral-500">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Dziecko</th>
                  <th className="py-2 pr-3">Styl</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Bledy</th>
                </tr>
              </thead>
              <tbody>
                {validationResults.map((r) => (
                  <tr key={r.index} className="border-b border-neutral-100">
                    <td className="py-2 pr-3 text-neutral-400">{r.index + 1}</td>
                    <td className="py-2 pr-3 font-medium">{r.valid ? r.profile.childName : '—'}</td>
                    <td className="py-2 pr-3">{r.valid ? (r.profile.chosenStyle ?? 'A') : '—'}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${r.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {r.valid ? 'OK' : 'Blad'}
                      </span>
                    </td>
                    <td className="py-2 text-red-600 text-xs">{r.errors.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {createResult && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${createResult.errors.length > 0 ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}
          >
            <p className="font-semibold">Utworzono: {createResult.created} zamówień</p>
            {createResult.errors.map((e, i) => (
              <p key={i} className="text-red-600 mt-1">
                {e}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Orders Tab
// ════════════════════════════════════════════════════════════

function OrdersTab() {
  const orders = useQuery(api.admin.bookBatch.listOrders);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400 mb-4">
        Zamówienia
      </h2>
      {!orders ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 spinner" />
        </div>
      ) : orders.length === 0 ? (
        <p className="text-sm text-neutral-400">Brak zamówień</p>
      ) : (
        <div className="space-y-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-500">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Dziecko</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Agent</th>
                <th className="py-2 pr-3">Styl</th>
                <th className="py-2 pr-3">Utworzono</th>
                <th className="py-2">Blad</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <>
                  <tr
                    key={o._id}
                    onClick={() => setExpandedId(expandedId === o._id ? null : o._id)}
                    className={`border-b border-neutral-100 cursor-pointer hover:bg-neutral-50 transition-colors ${expandedId === o._id ? 'bg-neutral-50' : ''}`}
                  >
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void navigator.clipboard.writeText(o._id);
                        }}
                        title="Kliknij aby skopiować ID"
                        className="font-mono text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors cursor-copy"
                      >
                        {(o._id as string).slice(-12)}
                      </button>
                    </td>
                    <td className="py-2 pr-3 font-medium">
                      {o.childName}
                      {o.skipQaReviews && (
                        <span className="ml-1.5 text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                          FAST
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[o.status] ?? 'bg-neutral-100 text-neutral-700'}`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-neutral-500">{o.currentAgent ?? '—'}</td>
                    <td className="py-2 pr-3">{o.chosenStyle ?? '—'}</td>
                    <td className="py-2 pr-3 text-neutral-400">
                      {new Date(o.createdAt).toLocaleString('pl-PL')}
                    </td>
                    <td className="py-2 text-red-500 text-xs max-w-[200px] truncate">
                      {o.error ?? ''}
                    </td>
                  </tr>
                  {expandedId === o._id && (
                    <tr key={`${o._id}-detail`}>
                      <td colSpan={7} className="p-0">
                        <OrderDetailPanel orderId={o._id as Id<'bookOrders'>} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Order Detail Panel
// ════════════════════════════════════════════════════════════

function OrderDetailPanel({ orderId }: { orderId: Id<'bookOrders'> }) {
  const detail = useQuery(api.admin.bookBatch.getOrderDetail, { orderId });
  const pipelineEvents = useQuery(api.bookPipelineEvents.getOrderEvents, { orderId });
  const retryOrder = useAction(api.admin.bookBatch.retryOrder);
  const cancelOrderAction = useAction(api.admin.bookBatch.cancelOrder);
  const regeneratePdfAction = useAction(api.admin.bookBatch.regeneratePdf);
  const [retrying, setRetrying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [retryAgent, setRetryAgent] = useState('');
  const [openArtifacts, setOpenArtifacts] = useState<Set<string>>(new Set());
  const [timelineOpen, setTimelineOpen] = useState(false);

  if (!detail) {
    return <div className="p-4 text-sm text-neutral-400">Loading...</div>;
  }

  const handleRetry = async (fromAgent?: string) => {
    setRetrying(true);
    try {
      await retryOrder({ orderId, fromAgent: fromAgent || undefined });
    } catch {
      // Error will be visible in order status
    } finally {
      setRetrying(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelOrderAction({ orderId, reason: 'Stopped by admin' });
    } catch {
      // Error visible in order status
    } finally {
      setCancelling(false);
    }
  };

  const handleRegeneratePdf = async () => {
    setRegenerating(true);
    try {
      await regeneratePdfAction({ orderId });
      toast.success('PDF regeneration started');
    } catch (err) {
      toast.error(`PDF regen failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRegenerating(false);
    }
  };

  const toggleArtifact = (key: string) => {
    setOpenArtifacts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const formatJson = (raw: string | null) => {
    if (!raw) return null;
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  };

  return (
    <div className="border-t border-neutral-200 bg-neutral-50 p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[detail.status] ?? 'bg-neutral-100'}`}
        >
          {detail.status}
        </span>
        {detail.currentAgent && (
          <span className="text-xs text-neutral-500">Agent: {detail.currentAgent}</span>
        )}
        {detail.error && (
          <span className="text-xs text-red-600 max-w-md truncate">{detail.error}</span>
        )}
        {detail.skipQaReviews && (
          <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
            FAST
          </span>
        )}
        <span className="text-xs text-neutral-400">Retries: {detail.retryCount}</span>
      </div>

      {/* Pipeline Timeline (collapsible) */}
      <div className="border border-neutral-200 rounded-lg bg-white">
        <button
          onClick={() => setTimelineOpen(!timelineOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-neutral-50"
        >
          <span className="font-bold uppercase tracking-wide text-neutral-400">
            Historia pipeline
          </span>
          <span className="text-neutral-400">
            {pipelineEvents ? `${pipelineEvents.length} events` : '...'}{' '}
            {timelineOpen ? '\u25B2' : '\u25BC'}
          </span>
        </button>
        {timelineOpen && (
          <div className="px-3 pb-3">
            <OrderTimeline events={pipelineEvents} compact />
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="flex gap-4 text-xs text-neutral-400">
        <span>Created: {new Date(detail.createdAt).toLocaleString('pl-PL')}</span>
        {detail.updatedAt && (
          <span>Updated: {new Date(detail.updatedAt).toLocaleString('pl-PL')}</span>
        )}
        {detail.completedAt && (
          <span>Completed: {new Date(detail.completedAt).toLocaleString('pl-PL')}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {detail.status !== 'completed' &&
          detail.status !== 'failed' &&
          detail.status !== 'paused' && (
            <button
              onClick={() => void handleCancel()}
              disabled={cancelling}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-40"
            >
              {cancelling ? 'Stopping...' : 'Stop'}
            </button>
          )}
        {(detail.status === 'failed' || detail.status === 'paused') && detail.currentAgent && (
          <button
            onClick={() => void handleRetry(detail.currentAgent)}
            disabled={retrying}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-40"
          >
            {retrying
              ? 'Retrying...'
              : `${detail.status === 'paused' ? 'Resume' : 'Retry'} from ${detail.currentAgent}`}
          </button>
        )}
        {detail.llmCallCount != null && (
          <span className="text-xs text-neutral-400">
            API calls: <span className="font-mono font-semibold">{detail.llmCallCount}</span>/50
          </span>
        )}
        <div className="flex items-center gap-1">
          <select
            value={retryAgent}
            onChange={(e) => setRetryAgent(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
          >
            <option value="">Retry from...</option>
            {AGENT_LIST.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          {retryAgent && (
            <button
              onClick={() => void handleRetry(retryAgent)}
              disabled={retrying}
              className="rounded-md bg-neutral-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-600 disabled:opacity-40"
            >
              Go
            </button>
          )}
        </div>
      </div>

      {/* Artifacts */}
      <div className="space-y-1">
        <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-400">Artifacts</h3>
        {ARTIFACT_FIELDS.map(({ key, label }) => {
          const value = detail[key as keyof typeof detail] as string | null;
          const isOpen = openArtifacts.has(key);
          return (
            <div key={key} className="border border-neutral-200 rounded-md bg-white">
              <button
                onClick={() => toggleArtifact(key)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-neutral-50"
              >
                <span className="font-medium">{label}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${value ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-400'}`}
                >
                  {value ? 'has data' : 'empty'}
                </span>
              </button>
              {isOpen && value && (
                <pre className="px-3 pb-3 text-xs font-mono text-neutral-700 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {formatJson(value)}
                </pre>
              )}
            </div>
          );
        })}
      </div>

      {/* Illustrations */}
      {detail.illustrationUrls && detail.illustrationUrls.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-400">
            Illustrations
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {detail.illustrationUrls.map(
              (ill: {
                illustrationId: string;
                url: string | null;
                width: number;
                height: number;
              }) => (
                <div
                  key={ill.illustrationId}
                  className="rounded-md border border-neutral-200 overflow-hidden bg-white"
                >
                  {ill.url ? (
                    <img src={ill.url} alt={ill.illustrationId} className="w-full h-auto" />
                  ) : (
                    <div className="h-24 flex items-center justify-center text-xs text-neutral-400">
                      No URL
                    </div>
                  )}
                  <div className="px-2 py-1 text-xs text-neutral-500 text-center">
                    {ill.illustrationId}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Style Vote */}
      {(detail.styleVoteUrlA || detail.styleVoteUrlB) && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-400">Style Vote</h3>
          <div className="flex gap-3">
            {detail.styleVoteUrlA && (
              <div
                className={`rounded-md border-2 overflow-hidden ${detail.chosenStyle === 'A' ? 'border-green-500' : 'border-neutral-200'}`}
              >
                <img src={detail.styleVoteUrlA} alt="Style A" className="w-32 h-32 object-cover" />
                <div className="text-xs text-center py-1">
                  A{' '}
                  {detail.chosenStyle === 'A' && (
                    <span className="text-green-600 font-semibold">chosen</span>
                  )}
                </div>
              </div>
            )}
            {detail.styleVoteUrlB && (
              <div
                className={`rounded-md border-2 overflow-hidden ${detail.chosenStyle === 'B' ? 'border-green-500' : 'border-neutral-200'}`}
              >
                <img src={detail.styleVoteUrlB} alt="Style B" className="w-32 h-32 object-cover" />
                <div className="text-xs text-center py-1">
                  B{' '}
                  {detail.chosenStyle === 'B' && (
                    <span className="text-green-600 font-semibold">chosen</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF */}
      <div className="flex items-center gap-3">
        {detail.pdfUrl && (
          <a
            href={detail.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
          >
            Pobierz PDF
          </a>
        )}
        {detail.storyDraft && (
          <button
            onClick={() => void handleRegeneratePdf()}
            disabled={regenerating || detail.status === 'composing_pdf'}
            className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
          >
            {regenerating ? 'Generuję...' : 'Regeneruj PDF'}
          </button>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Prompts Tab
// ════════════════════════════════════════════════════════════

function PromptsTab() {
  const prompts = useQuery(api.admin.bookPrompts.listBookPrompts);
  const savePrompt = useMutation(api.admin.bookPrompts.saveBookPrompt);
  const resetPrompt = useMutation(api.admin.bookPrompts.resetBookPrompt);
  const restoreVersion = useMutation(api.admin.bookPrompts.restorePromptVersion);
  const importSingle = useMutation(api.admin.bookPrompts.importPromptAdmin);
  const importAll = useMutation(api.admin.bookPrompts.importAllPromptsAdmin);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const importFileRef = useRef<HTMLInputElement>(null);
  const importAllFileRef = useRef<HTMLInputElement>(null);

  // When prompts load, auto-select the first one
  const effectiveKey = selectedKey ?? prompts?.[0]?.key ?? null;
  const selectedPrompt = prompts?.find((p) => p.key === effectiveKey);

  const handleSelect = (key: string) => {
    setSelectedKey(key);
    setLastSyncedKey(null); // force re-sync on next render
    setHistoryOpen(false);
  };

  // All prompts live in DB now (seeded from fallbacks)
  const displayContent = selectedPrompt?.dbContent ?? '';

  // Sync editor when display content changes
  const [lastSyncedKey, setLastSyncedKey] = useState<string | null>(null);
  if (effectiveKey !== lastSyncedKey && displayContent) {
    setEditorContent(displayContent);
    setLastSyncedKey(effectiveKey);
  }

  const handleSave = async () => {
    if (!effectiveKey) return;
    setSaving(true);
    try {
      await savePrompt({ templateKey: effectiveKey, content: editorContent });
      toast.success('Prompt zapisany');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Blad zapisu');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!effectiveKey) return;
    setSaving(true);
    try {
      await resetPrompt({ templateKey: effectiveKey });
      setLastSyncedKey(null); // force re-sync on next render
      toast.success('Prompt zresetowany do domyslnego');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Blad resetu');
    } finally {
      setSaving(false);
    }
  };

  // ── Export single prompt ──────────────────────────────────
  const exportSingleJson = useQuery(
    api.admin.bookPrompts.exportPrompt,
    effectiveKey && selectedPrompt?.hasPrompt ? { promptKey: effectiveKey } : 'skip',
  );

  const handleExportSingle = () => {
    if (!exportSingleJson || !effectiveKey) return;
    const meta = selectedPrompt;
    const filename = `prompt-${meta?.filename ?? effectiveKey}.json`;
    downloadJson(exportSingleJson, filename);
    toast.success('Prompt wyeksportowany');
  };

  // ── Export all prompts ────────────────────────────────────
  const exportAllJson = useQuery(api.admin.bookPrompts.exportAllPromptsAdmin);

  const handleExportAll = () => {
    if (!exportAllJson) return;
    downloadJson(exportAllJson, 'all-prompts.json');
    toast.success('Wszystkie prompty wyeksportowane');
  };

  // ── Import single prompt ──────────────────────────────────
  const handleImportSingle = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as { promptKey?: string; content?: string };
        if (!parsed.promptKey || !parsed.content) {
          toast.error('Plik JSON musi zawierac promptKey i content');
          return;
        }
        await importSingle({
          promptKey: parsed.promptKey,
          content: parsed.content,
          changeNote: 'Imported from file',
        });
        toast.success(`Prompt ${parsed.promptKey} zaimportowany`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Blad importu');
      }
    },
    [importSingle],
  );

  // ── Import all prompts ────────────────────────────────────
  const handleImportAll = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const result = await importAll({ data: text });
        if (result.failed > 0) {
          toast.warning(
            `Zaimportowano ${result.imported}, bledy: ${result.failed} (${result.errors.join(', ')})`,
          );
        } else {
          toast.success(`Zaimportowano ${result.imported} promptów`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Blad importu');
      }
    },
    [importAll],
  );

  // Extract placeholders from editor content
  const placeholders = editorContent
    ? Array.from(editorContent.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)).map((m) => m[1])
    : [];
  const uniquePlaceholders = [...new Set(placeholders)];

  if (!prompts) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 spinner" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 min-h-[600px]">
      {/* Left: prompt list */}
      <div className="w-64 shrink-0 space-y-1">
        {prompts.map((p) => (
          <button
            key={p.key}
            onClick={() => handleSelect(p.key)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              effectiveKey === p.key
                ? 'bg-neutral-100 text-neutral-900'
                : 'hover:bg-neutral-50 text-neutral-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium flex-1">{p.agentName}</span>
              {p.versionCount > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    effectiveKey === p.key
                      ? 'bg-neutral-600 text-neutral-300'
                      : 'bg-neutral-200 text-neutral-500'
                  }`}
                >
                  v{p.versionCount}
                </span>
              )}
            </div>
            {p.hasPrompt && (
              <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                Modified
              </span>
            )}
          </button>
        ))}

        {/* Import/Export All section */}
        <div className="pt-4 border-t border-neutral-200 mt-4 space-y-2">
          <button
            onClick={handleExportAll}
            disabled={!exportAllJson}
            className="w-full rounded-lg bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export all prompts
          </button>
          <button
            onClick={() => importAllFileRef.current?.click()}
            className="w-full rounded-lg bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 transition-colors flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Import all prompts
          </button>
          <input
            ref={importAllFileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportAll(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* Right: editor */}
      <div className="flex-1 space-y-3">
        {selectedPrompt && (
          <>
            {/* Header with export/import buttons */}
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-neutral-900">{selectedPrompt.agentName}</h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  selectedPrompt.hasPrompt
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {selectedPrompt.hasPrompt ? 'Modified' : 'Default'}
              </span>

              <div className="ml-auto flex items-center gap-2">
                {/* Export single */}
                <button
                  onClick={handleExportSingle}
                  disabled={!exportSingleJson}
                  title="Export prompt"
                  className="rounded-md bg-neutral-100 p-1.5 text-neutral-600 hover:bg-neutral-200 transition-colors disabled:opacity-30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </button>

                {/* Import single */}
                <button
                  onClick={() => importFileRef.current?.click()}
                  title="Import prompt"
                  className="rounded-md bg-neutral-100 p-1.5 text-neutral-600 hover:bg-neutral-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                </button>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImportSingle(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              rows={20}
              className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3 font-mono text-xs focus:border-neutral-500 focus:outline-none resize-y"
            />

            {/* Placeholders info */}
            {uniquePlaceholders.length > 0 && (
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                <span className="font-semibold">Placeholders:</span>{' '}
                {uniquePlaceholders.map((p) => `{{${p}}}`).join(', ')}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              {selectedPrompt.hasPrompt && (
                <button
                  onClick={() => void handleReset()}
                  disabled={saving}
                  className="rounded-lg bg-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-300 transition-colors disabled:opacity-40"
                >
                  Reset to default
                </button>
              )}
            </div>

            {/* Version History Section */}
            {effectiveKey && (
              <VersionHistoryPanel
                promptKey={effectiveKey}
                isOpen={historyOpen}
                onToggle={() => setHistoryOpen(!historyOpen)}
                onRestore={async (versionId) => {
                  try {
                    await restoreVersion({ promptKey: effectiveKey, versionId });
                    setLastSyncedKey(null);
                    toast.success('Wersja przywrocona');
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Blad przywracania');
                  }
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Version History Panel
// ════════════════════════════════════════════════════════════

function VersionHistoryPanel({
  promptKey,
  isOpen,
  onToggle,
  onRestore,
}: {
  promptKey: string;
  isOpen: boolean;
  onToggle: () => void;
  onRestore: (versionId: Id<'bookPromptVersions'>) => Promise<void>;
}) {
  const versions = useQuery(api.admin.bookPrompts.listPromptVersions, { promptKey });
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const handleRestore = async (versionId: Id<'bookPromptVersions'>) => {
    setRestoring(true);
    try {
      await onRestore(versionId);
      setConfirmRestore(null);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="rounded-lg border border-neutral-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-neutral-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-neutral-700">Historia wersji</span>
          {versions && versions.length > 0 && (
            <span className="text-xs bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded-full">
              {versions.length}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-neutral-200">
          {!versions ? (
            <div className="flex justify-center py-4">
              <div className="w-4 h-4 spinner" />
            </div>
          ) : versions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-neutral-400">
              Brak historii wersji dla tego promptu.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-neutral-50 text-neutral-500 text-left">
                    <th className="px-3 py-2 font-medium">Wersja</th>
                    <th className="px-3 py-2 font-medium">Data</th>
                    <th className="px-3 py-2 font-medium">Edytor</th>
                    <th className="px-3 py-2 font-medium">Notatka</th>
                    <th className="px-3 py-2 font-medium w-24">Akcja</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((ver) => {
                    const isExpanded = expandedVersion === ver._id;
                    const isConfirming = confirmRestore === ver._id;

                    return (
                      <VersionRow
                        key={ver._id}
                        ver={ver}
                        isExpanded={isExpanded}
                        isConfirming={isConfirming}
                        restoring={restoring}
                        onToggleExpand={() => setExpandedVersion(isExpanded ? null : ver._id)}
                        onConfirmRestore={() => setConfirmRestore(ver._id)}
                        onCancelRestore={() => setConfirmRestore(null)}
                        onRestore={() => void handleRestore(ver._id as Id<'bookPromptVersions'>)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Version Row (expanded view with full content)
// ════════════════════════════════════════════════════════════

function VersionRow({
  ver,
  isExpanded,
  isConfirming,
  restoring,
  onToggleExpand,
  onConfirmRestore,
  onCancelRestore,
  onRestore,
}: {
  ver: {
    _id: string;
    version: number;
    editedAt: number;
    editedBy: string;
    changeNote: string | null;
    contentPreview: string;
  };
  isExpanded: boolean;
  isConfirming: boolean;
  restoring: boolean;
  onToggleExpand: () => void;
  onConfirmRestore: () => void;
  onCancelRestore: () => void;
  onRestore: () => void;
}) {
  // Only fetch full content when expanded
  const fullVersion = useQuery(
    api.admin.bookPrompts.getPromptVersion,
    isExpanded ? { versionId: ver._id as Id<'bookPromptVersions'> } : 'skip',
  );

  // Truncate subject ID for display
  const editorDisplay = ver.editedBy.length > 20 ? ver.editedBy.slice(0, 18) + '...' : ver.editedBy;

  return (
    <>
      <tr
        className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer"
        onClick={onToggleExpand}
      >
        <td className="px-3 py-2 font-mono font-bold text-neutral-700">v{ver.version}</td>
        <td className="px-3 py-2 text-neutral-500">
          {new Date(ver.editedAt).toLocaleString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </td>
        <td className="px-3 py-2 text-neutral-500" title={ver.editedBy}>
          {editorDisplay}
        </td>
        <td className="px-3 py-2 text-neutral-400 max-w-[200px] truncate">
          {ver.changeNote ?? '—'}
        </td>
        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
          {isConfirming ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onRestore}
                disabled={restoring}
                className="rounded bg-amber-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-amber-500 disabled:opacity-40"
              >
                {restoring ? '...' : 'Na pewno?'}
              </button>
              <button
                onClick={onCancelRestore}
                className="rounded bg-neutral-200 px-2 py-1 text-[10px] font-bold text-neutral-600 hover:bg-neutral-300"
              >
                Nie
              </button>
            </div>
          ) : (
            <button
              onClick={onConfirmRestore}
              className="rounded bg-neutral-200 px-2 py-1 text-[10px] font-bold text-neutral-600 hover:bg-neutral-300 transition-colors"
            >
              Przywroc
            </button>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5} className="px-3 py-2 bg-neutral-50">
            {fullVersion ? (
              <pre className="text-xs font-mono text-neutral-700 whitespace-pre-wrap max-h-48 overflow-y-auto rounded bg-white border border-neutral-200 p-3">
                {fullVersion.content}
              </pre>
            ) : (
              <div className="flex justify-center py-2">
                <div className="w-3 h-3 spinner" />
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
