import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { api } from '../../../convex/_generated/api';
import { ConfigKey } from '../../../convex/lib/config';

export function DebugTabConfig() {
  const pipelineData = useQuery(api.pipelineConfig.getPipeline);
  const configEntries = useQuery(api.config.list);
  const autoGenerateExercises = configEntries?.find((entry) => entry.key === ConfigKey.AUTO_GENERATE_EXERCISES)?.value === 'true';
  const dbLoggingEnabled = configEntries?.find((entry) => entry.key === ConfigKey.DEBUG_DB_LOGGING)?.value === 'true';

  const adminConfigEntries = useQuery(api.admin.config.list);
  const corpora = useQuery(api.admin.corpus.list);
  const activeCorpusId = adminConfigEntries?.find((c) => c.key === 'active_corpus_id')?.value ?? '';

  const updateConfig = useMutation(api.config.set);
  const setAdminConfig = useMutation(api.admin.config.set);
  const [exerciseStatus, setExerciseStatus] = useState<string | null>(null);
  const [dbLoggingStatus, setDbLoggingStatus] = useState<string | null>(null);
  const [corpusStatus, setCorpusStatus] = useState<string | null>(null);
  const [isPipelineOpen, setIsPipelineOpen] = useState(false);

  const handleExerciseToggle = (enabled: boolean) => {
    setExerciseStatus('Saving…');
    void updateConfig({ key: ConfigKey.AUTO_GENERATE_EXERCISES, value: enabled ? 'true' : 'false' })
      .then(() => setExerciseStatus('Saved'))
      .catch((error) => {
        console.error('Failed to update config', error);
        setExerciseStatus('Failed to save');
      });
  };

  const handleDbLoggingToggle = (enabled: boolean) => {
    setDbLoggingStatus('Saving…');
    void updateConfig({ key: ConfigKey.DEBUG_DB_LOGGING, value: enabled ? 'true' : 'false' })
      .then(() => setDbLoggingStatus('Saved'))
      .catch((error) => {
        console.error('Failed to update config', error);
        setDbLoggingStatus('Failed to save');
      });
  };

  const handleCorpusChange = (value: string) => {
    setCorpusStatus('Saving…');
    void setAdminConfig({ key: 'active_corpus_id', value })
      .then(() => setCorpusStatus('Saved'))
      .catch((error) => {
        console.error('Failed to update corpus', error);
        setCorpusStatus('Failed to save');
      });
  };

  return (
    <div className="text-sm space-y-4">
      {/* Pipeline Config (read-only, from backend) */}
      <div className="rounded-2xl border border-gray-200 bg-white/80 p-3">
        <button onClick={() => setIsPipelineOpen(!isPipelineOpen)} className="flex items-center gap-2 w-full text-left">
          <svg className={`w-4 h-4 transition-transform text-gray-500 ${isPipelineOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pipeline config — {pipelineData?.profile ?? '…'}</span>
        </button>
        {isPipelineOpen && (
          <div className="mt-3">
            {!pipelineData ? (
              <div className="text-xs text-gray-400 py-2">Loading pipeline config…</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1 text-gray-500 font-medium">Stage</th>
                    <th className="text-left py-1 text-gray-500 font-medium">Model</th>
                    <th className="text-right py-1 text-gray-500 font-medium">Temp</th>
                    <th className="text-right py-1 text-gray-500 font-medium">Retries</th>
                    <th className="text-right py-1 text-gray-500 font-medium">Delay</th>
                    <th className="text-center py-1 text-gray-500 font-medium">Web</th>
                    <th className="text-center py-1 text-gray-500 font-medium">Reason</th>
                    <th className="text-left py-1 text-gray-500 font-medium">Expect</th>
                  </tr>
                </thead>
                <tbody>
                  {pipelineData.stages.map((s) => (
                    <tr key={s.stage} className="border-b border-gray-100">
                      <td className="py-1 font-mono text-gray-700">{s.stage}</td>
                      <td className="py-1 text-gray-600">{s.model}</td>
                      <td className="py-1 text-right text-gray-600">{s.temperature}</td>
                      <td className="py-1 text-right text-gray-600">{s.retries}</td>
                      <td className="py-1 text-right text-gray-600">{s.baseDelayMs}</td>
                      <td className="py-1 text-center">{s.webSearch ? '✓' : '—'}</td>
                      <td className="py-1 text-center">{s.reasoning === false ? '✗' : '✓'}</td>
                      <td className="py-1 text-gray-600">{s.expect ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Auto-generate Exercises */}
      <div className="rounded-2xl border border-gray-200 bg-white/80 p-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Auto-generate Exercises</div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input type="checkbox" checked={autoGenerateExercises} disabled={!configEntries} onChange={(e) => handleExerciseToggle(e.target.checked)} className="sr-only peer" />
            <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-orange-500 transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
          </div>
          <span className="text-sm text-gray-700">{autoGenerateExercises ? 'Enabled' : 'Disabled'}</span>
        </label>
        <div className="mt-2 text-xs text-gray-500">{exerciseStatus || 'When enabled, exercises are auto-generated with modules. When disabled, users click "Generate Exercise".'}</div>
      </div>

      {/* DB Logging */}
      <div className="rounded-2xl border border-gray-200 bg-white/80 p-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">DB Logging</div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input type="checkbox" checked={dbLoggingEnabled} disabled={!configEntries} onChange={(e) => handleDbLoggingToggle(e.target.checked)} className="sr-only peer" />
            <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-orange-500 transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
          </div>
          <span className="text-sm text-gray-700">{dbLoggingEnabled ? 'Enabled' : 'Disabled'}</span>
        </label>
        <div className="mt-2 text-xs text-gray-500">{dbLoggingStatus || 'When enabled, backend logs are stored in database. Disable to reduce function calls.'}</div>
      </div>

      {/* Active Corpus */}
      <div className="rounded-2xl border border-gray-200 bg-white/80 p-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Active Corpus</div>
        <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={activeCorpusId} disabled={!adminConfigEntries} onChange={(e) => handleCorpusChange(e.target.value)}>
          <option value="">No corpus (text-only)</option>
          {corpora?.map((c) => (
            <option key={c._id} value={c._id}>
              v{c.version} — {c.name} ({c.segmentCount} segments)
            </option>
          ))}
        </select>
        <div className="mt-1 text-xs text-gray-500">{corpusStatus || 'Knowledge corpus injected into lesson generation.'}</div>
      </div>
    </div>
  );
}
