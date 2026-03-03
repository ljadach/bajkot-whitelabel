import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { toast } from 'sonner';
import type { Id } from '../../../convex/_generated/dataModel';

export function CorpusEditor() {
  const videos = useQuery(api.admin.videos.list);
  const allSegments = useQuery(api.admin.segments.listAll);
  const corpora = useQuery(api.admin.corpus.list);
  const mergeCorpus = useMutation(api.admin.corpus.merge);
  const removeCorpus = useMutation(api.admin.corpus.remove);

  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<'include' | 'exclude'>('exclude');
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);
  const [viewCorpusId, setViewCorpusId] = useState<string | null>(null);

  const processedVideos = useMemo(() => (videos ?? []).filter((v) => v.status === 'processed'), [videos]);

  const allTags = useMemo(() => {
    if (!allSegments) return [];
    const tags = new Set<string>();
    for (const seg of allSegments) {
      for (const t of seg.tags) tags.add(t);
    }
    return Array.from(tags);
  }, [allSegments]);

  const previewCount = useMemo(() => {
    if (!allSegments) return 0;
    return allSegments.filter((seg) => {
      if (!selectedVideoIds.has(seg.videoId)) return false;
      if (!seg.enabled) return false;
      if (filterTags.size > 0) {
        const hasTag = seg.tags.some((t) => filterTags.has(t));
        if (filterMode === 'include' && !hasTag) return false;
        if (filterMode === 'exclude' && hasTag) return false;
      }
      return true;
    }).length;
  }, [allSegments, selectedVideoIds, filterMode, filterTags]);

  const toggleVideo = (id: string) => {
    setSelectedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVideos = () => {
    if (selectedVideoIds.size === processedVideos.length) {
      setSelectedVideoIds(new Set());
    } else {
      setSelectedVideoIds(new Set(processedVideos.map((v) => v._id)));
    }
  };

  const toggleFilterTag = (tag: string) => {
    setFilterTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleMerge = async () => {
    if (selectedVideoIds.size === 0) {
      toast.error('Select at least one video');
      return;
    }
    setMerging(true);
    try {
      const videoIds = Array.from(selectedVideoIds) as Id<'pipelineVideos'>[];
      await mergeCorpus({
        videoIds,
        tagFilter: {
          mode: filterMode,
          tags: Array.from(filterTags),
        },
      });
      toast.success('Corpus created');
      setSelectedVideoIds(new Set());
    } catch (e) {
      toast.error('Failed: ' + (e instanceof Error ? e.message : 'Unknown'));
    } finally {
      setMerging(false);
    }
  };

  const viewingCorpus = viewCorpusId ? corpora?.find((c) => c._id === viewCorpusId) : null;

  if (videos === undefined || corpora === undefined || allSegments === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Knowledge Corpus</h1>
        <p className="text-sm text-neutral-500 mt-1">Build versioned knowledge corpora from processed video segments</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Build new corpus - 2/5 width */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Build New Corpus</h2>

          {/* Video selection */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Select Videos</label>
              <button onClick={selectAllVideos} className="text-xs text-neutral-500 hover:text-neutral-700">
                {selectedVideoIds.size === processedVideos.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-0.5 max-h-48 overflow-auto border border-neutral-100 rounded-lg p-2">
              {processedVideos.length === 0 ? (
                <p className="text-sm text-neutral-400 py-2 text-center">No processed videos</p>
              ) : (
                processedVideos.map((v) => (
                  <label key={v._id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-neutral-50 cursor-pointer">
                    <input type="checkbox" checked={selectedVideoIds.has(v._id)} onChange={() => toggleVideo(v._id)} className="rounded border-neutral-300" />
                    <span className="text-sm text-neutral-700 truncate">{v.fileName}</span>
                    <span className="text-xs text-neutral-400 ml-auto shrink-0 tabular-nums">{v.segmentCount}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Tag filter */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 block">Tag Filter</label>
            <div className="flex items-center gap-2 mb-2">
              <select value={filterMode} onChange={(e) => setFilterMode(e.target.value as 'include' | 'exclude')} className="px-2 py-1 border border-neutral-200 rounded text-sm bg-white">
                <option value="include">Include only</option>
                <option value="exclude">Exclude</option>
              </select>
              <span className="text-xs text-neutral-400">segments with tags:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allTags.length === 0 ? (
                <span className="text-xs text-neutral-400">No tags in use</span>
              ) : (
                allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleFilterTag(tag)}
                    className={`px-2 py-1 text-xs rounded-full border transition-colors ${filterTags.has(tag) ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}
                  >
                    {tag}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Merge action */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
            <div className="text-sm">
              <span className="font-semibold text-neutral-900 tabular-nums">{previewCount}</span>
              <span className="text-neutral-500 ml-1">segments</span>
            </div>
            <button onClick={() => void handleMerge()} disabled={merging || selectedVideoIds.size === 0} className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-30 transition-colors">
              {merging ? 'Merging...' : 'Merge into Corpus'}
            </button>
          </div>
        </div>

        {/* Corpus history - 3/5 width */}
        <div className="lg:col-span-3">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">Corpus Versions</h2>
          {corpora.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 border border-dashed border-neutral-200 rounded-xl bg-white">
              <p>No corpora yet</p>
              <p className="text-sm mt-1">Build your first corpus from processed videos</p>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/80">
                    <th className="px-4 py-3 text-left font-semibold text-neutral-500 text-xs uppercase tracking-wider">Name</th>
                    <th className="px-3 py-3 text-center font-semibold text-neutral-500 text-xs uppercase tracking-wider w-20">Version</th>
                    <th className="px-3 py-3 text-center font-semibold text-neutral-500 text-xs uppercase tracking-wider w-24">Segments</th>
                    <th className="px-3 py-3 text-center font-semibold text-neutral-500 text-xs uppercase tracking-wider w-20">Videos</th>
                    <th className="px-3 py-3 text-left font-semibold text-neutral-500 text-xs uppercase tracking-wider w-28">Created</th>
                    <th className="px-3 py-3 text-right font-semibold text-neutral-500 text-xs uppercase tracking-wider w-36">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {corpora.map((corpus) => (
                    <tr key={corpus._id} className={`border-b border-neutral-50 transition-colors ${viewCorpusId === corpus._id ? 'bg-purple-50' : 'hover:bg-neutral-50/50'}`}>
                      <td className="px-4 py-3 font-medium text-neutral-900">{corpus.name}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700">v{corpus.version}</span>
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums text-neutral-600">{corpus.segmentCount}</td>
                      <td className="px-3 py-3 text-center tabular-nums text-neutral-600">{corpus.videoIds.length}</td>
                      <td className="px-3 py-3 text-xs text-neutral-500">{new Date(corpus.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewCorpusId(viewCorpusId === corpus._id ? null : corpus._id)}
                            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                            title={viewCorpusId === corpus._id ? 'Hide content' : 'View content'}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          </button>
                          <button
                            onClick={() =>
                              void (async () => {
                                try {
                                  await navigator.clipboard.writeText(corpus.content);
                                  toast.success('Copied to clipboard');
                                } catch {
                                  toast.error('Failed to copy');
                                }
                              })()
                            }
                            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                            title="Copy to clipboard"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() =>
                              void (async () => {
                                if (!confirm(`Delete "${corpus.name}"? This cannot be undone.`)) return;
                                try {
                                  await removeCorpus({ corpusId: corpus._id });
                                  toast.success('Corpus deleted');
                                } catch (e) {
                                  toast.error('Delete failed: ' + (e instanceof Error ? e.message : 'Unknown'));
                                }
                              })()
                            }
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete corpus"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Corpus content viewer */}
      {viewingCorpus && (
        <div className="mt-6 bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-neutral-900">{viewingCorpus.name} — Content</h3>
            <button onClick={() => setViewCorpusId(null)} className="text-xs text-neutral-400 hover:text-neutral-600">
              Close
            </button>
          </div>
          <pre className="p-4 bg-neutral-50 rounded-lg text-xs text-neutral-700 overflow-auto max-h-96 whitespace-pre-wrap">{viewingCorpus.content || '(empty corpus)'}</pre>
        </div>
      )}
    </div>
  );
}
