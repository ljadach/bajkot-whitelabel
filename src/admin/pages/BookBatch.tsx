import { useState } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { validateBatchProfile, parseBatchJson, type BatchProfile } from '../../lib/bookBatchValidation';

type ValidationResult = { index: number; profile: BatchProfile; valid: boolean; errors: string[] };

const STATUS_COLORS: Record<string, string> = {
  intake: 'bg-blue-100 text-blue-800',
  profiling: 'bg-blue-100 text-blue-800',
  story_planning: 'bg-indigo-100 text-indigo-800',
  story_writing: 'bg-indigo-100 text-indigo-800',
  psych_review: 'bg-purple-100 text-purple-800',
  art_direction: 'bg-violet-100 text-violet-800',
  character_design: 'bg-violet-100 text-violet-800',
  style_vote: 'bg-amber-100 text-amber-800',
  illustrating: 'bg-orange-100 text-orange-800',
  visual_qa: 'bg-orange-100 text-orange-800',
  composing_pdf: 'bg-teal-100 text-teal-800',
  final_qa: 'bg-teal-100 text-teal-800',
  delivering: 'bg-green-100 text-green-800',
  completed: 'bg-green-200 text-green-900',
  failed: 'bg-red-100 text-red-800',
};

export function BookBatch() {
  const orders = useQuery(api.admin.bookBatch.listOrders);
  const batchCreate = useAction(api.admin.bookBatch.batchCreate);

  const [jsonInput, setJsonInput] = useState('');
  const [validationResults, setValidationResults] = useState<ValidationResult[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ created: number; errors: string[] } | null>(null);

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
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">Batch Book Orders</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Wklej JSON array z profilami. Każdy profil startuje pipeline bez pauzy na style_vote.
        </p>
      </div>

      {/* Import section */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400">Import & Create</h2>

        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder={'[\n  {\n    "childName": "Zosia",\n    "ageBracket": "3-5",\n    "gender": "girl",\n    "problemId": "fear_of_dark",\n    "hairColor": "blond",\n    "hairStyle": "dlugie_proste",\n    "eyeColor": "niebieskie",\n    "skinTone": "jasna",\n    "outfit": "sukienka_motyle",\n    "glasses": false,\n    "chosenStyle": "A"\n  }\n]'}
          rows={10}
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

        {/* Validation results table */}
        {validationResults && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-neutral-500">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Dziecko</th>
                  <th className="py-2 pr-3">Styl</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Błędy</th>
                </tr>
              </thead>
              <tbody>
                {validationResults.map((r) => (
                  <tr key={r.index} className="border-b border-neutral-100">
                    <td className="py-2 pr-3 text-neutral-400">{r.index + 1}</td>
                    <td className="py-2 pr-3 font-medium">{r.valid ? r.profile.childName : '—'}</td>
                    <td className="py-2 pr-3">{r.valid ? (r.profile.chosenStyle ?? 'A') : '—'}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${r.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {r.valid ? 'OK' : 'Błąd'}
                      </span>
                    </td>
                    <td className="py-2 text-red-600 text-xs">{r.errors.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create result */}
        {createResult && (
          <div className={`rounded-lg px-4 py-3 text-sm ${createResult.errors.length > 0 ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}>
            <p className="font-semibold">Utworzono: {createResult.created} zamówień</p>
            {createResult.errors.map((e, i) => (
              <p key={i} className="text-red-600 mt-1">{e}</p>
            ))}
          </div>
        )}
      </div>

      {/* Orders list */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400 mb-4">Zamówienia</h2>
        {!orders ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 spinner" /></div>
        ) : orders.length === 0 ? (
          <p className="text-sm text-neutral-400">Brak zamówień</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-neutral-500">
                  <th className="py-2 pr-3">Dziecko</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Agent</th>
                  <th className="py-2 pr-3">Styl</th>
                  <th className="py-2 pr-3">Utworzono</th>
                  <th className="py-2">Błąd</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-b border-neutral-100">
                    <td className="py-2 pr-3 font-medium">
                      <a href={`/book/${o._id}/progress`} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                        {o.childName}
                      </a>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[o.status] ?? 'bg-neutral-100 text-neutral-700'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-neutral-500">{o.currentAgent ?? '—'}</td>
                    <td className="py-2 pr-3">{o.chosenStyle ?? '—'}</td>
                    <td className="py-2 pr-3 text-neutral-400">{new Date(o.createdAt).toLocaleString('pl-PL')}</td>
                    <td className="py-2 text-red-500 text-xs max-w-[200px] truncate">{o.error ?? ''}</td>
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
