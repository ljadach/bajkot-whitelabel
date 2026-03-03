import { useState, useMemo } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { useNavigate } from 'react-router';
import { api } from '../../../convex/_generated/api';
import { toast } from 'sonner';
import type { Id } from '../../../convex/_generated/dataModel';

// Must match MAX_VIDEO_SIZE_BYTES in convex/admin/videoActions.ts
const MAX_VIDEO_SIZE_BYTES = 70 * 1024 * 1024; // 70 MB

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  processing: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  processed: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  failed: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

interface SyncFile {
  fileName: string;
  fileId: string;
  sizeBytes: number;
  durationSeconds: number | undefined;
  sourceUrl: string;
  fileHash: string;
  isNew: boolean;
}

type SortKey = 'fileName' | 'status' | 'toolDetected' | 'durationSeconds' | 'segmentCount';
type SortDir = 'asc' | 'desc';

export function VideoList() {
  const navigate = useNavigate();
  const videos = useQuery(api.admin.videos.list);
  const addVideo = useMutation(api.admin.videos.add);
  const removeVideo = useMutation(api.admin.videos.remove);
  const processVideo = useAction(api.admin.videoActions.processVideo);
  const uploadToCloudflare = useAction(api.admin.videoActions.uploadToCloudflare);
  const syncFromDrive = useAction(api.admin.videoActions.syncFromGoogleDrive);
  const bulkAdd = useAction(api.admin.videoActions.bulkAddFromSync);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('fileName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedError, setExpandedError] = useState<string | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncFile[] | null>(null);
  const [syncSelected, setSyncSelected] = useState<Set<string>>(new Set());

  const sortedVideos = useMemo(() => {
    if (!videos) return [];
    let filtered = videos;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = videos.filter((v) => v.fileName.toLowerCase().includes(q));
    }
    return [...filtered].sort((a, b) => {
      const valA = a[sortKey] ?? '';
      const valB = b[sortKey] ?? '';
      const cmp = typeof valA === 'number' && typeof valB === 'number' ? valA - valB : String(valA).localeCompare(String(valB));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [videos, searchQuery, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="text-neutral-300 ml-1">{'\u25B4\u25BE'}</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '\u25B4' : '\u25BE'}</span>;
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await addVideo({
        fileName: newName.trim(),
        sourceUrl: newUrl.trim() || undefined,
        durationSeconds: newDuration ? Number(newDuration) : undefined,
      });
      setNewName('');
      setNewUrl('');
      setNewDuration('');
      setShowAdd(false);
      toast.success('Video added');
    } catch (e) {
      toast.error('Failed: ' + (e instanceof Error ? e.message : 'Unknown'));
    }
  };

  const handleProcess = async (videoId: Id<'pipelineVideos'>) => {
    setProcessing((prev) => new Set(prev).add(videoId));
    try {
      const result = await processVideo({ videoId });
      if (result?.cloudflareOk) {
        toast.success('Processing complete');
      } else {
        toast.success('Processing complete (CF upload failed — retry available)', { duration: 6000 });
      }
    } catch (e) {
      toast.error('Processing failed: ' + (e instanceof Error ? e.message : 'Unknown'));
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  const handleUploadToCloudflare = async (videoId: Id<'pipelineVideos'>) => {
    setUploading((prev) => new Set(prev).add(videoId));
    try {
      await uploadToCloudflare({ videoId });
      toast.success('Cloudflare upload complete');
    } catch (e) {
      toast.error('CF upload failed: ' + (e instanceof Error ? e.message : 'Unknown'));
    } finally {
      setUploading((prev) => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  const handleProcessSelected = async () => {
    const ids = Array.from(selected) as Id<'pipelineVideos'>[];
    for (const id of ids) {
      await handleProcess(id);
    }
    setSelected(new Set());
  };

  const handleProcessNew = async () => {
    if (!videos) return;
    const newVideos = videos.filter((v) => v.status === 'new');
    for (const v of newVideos) {
      await handleProcess(v._id);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResults(null);
    try {
      const results = await syncFromDrive({});
      setSyncResults(results);
      const newIds = new Set(results.filter((f) => f.isNew).map((f) => f.fileId));
      setSyncSelected(newIds);
      const newCount = results.filter((f) => f.isNew).length;
      toast.success(`Found ${results.length} files (${newCount} new)`);
    } catch (e) {
      toast.error('Sync failed: ' + (e instanceof Error ? e.message : 'Unknown'));
    } finally {
      setSyncing(false);
    }
  };

  const handleAddFromSync = async () => {
    if (!syncResults) return;
    const filesToAdd = syncResults.filter((f) => syncSelected.has(f.fileId));
    if (filesToAdd.length === 0) return;

    try {
      await bulkAdd({
        files: filesToAdd.map((f) => ({
          fileName: f.fileName,
          fileId: f.fileId,
          sourceUrl: f.sourceUrl,
          durationSeconds: f.durationSeconds,
          sizeBytes: f.sizeBytes,
        })),
      });
      toast.success(`Added ${filesToAdd.length} videos to pipeline`);
      setSyncResults(null);
      setSyncSelected(new Set());
    } catch (e) {
      toast.error('Failed to add: ' + (e instanceof Error ? e.message : 'Unknown'));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!videos) return;
    if (selected.size === videos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(videos.map((v) => v._id)));
    }
  };

  const toggleSyncSelect = (fileId: string) => {
    setSyncSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  if (videos === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 spinner" />
      </div>
    );
  }

  const statusCounts = {
    new: videos.filter((v) => v.status === 'new').length,
    processing: videos.filter((v) => v.status === 'processing').length,
    processed: videos.filter((v) => v.status === 'processed').length,
    failed: videos.filter((v) => v.status === 'failed').length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Video Library</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-sm text-neutral-500">{sortedVideos.length} videos</span>
            <span className="text-[10px] text-neutral-400 border border-neutral-200 px-1.5 py-0.5 rounded">max {formatBytes(MAX_VIDEO_SIZE_BYTES)}/file</span>
            <div className="flex gap-1.5">
              {statusCounts.processed > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">{statusCounts.processed} processed</span>}
              {statusCounts.processing > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">{statusCounts.processing} processing</span>}
              {statusCounts.failed > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700">{statusCounts.failed} failed</span>}
              {statusCounts.new > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{statusCounts.new} new</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={() => void handleProcessSelected()} className="px-3 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              Process Selected ({selected.size})
            </button>
          )}
          <button onClick={() => void handleProcessNew()} disabled={statusCounts.new === 0} className="px-3 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-30 transition-colors">
            Process All New
          </button>
          <button onClick={() => void handleSync()} disabled={syncing} className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {syncing ? 'Syncing...' : 'Sync Google Drive'}
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="px-3 py-2 text-sm font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors">
            + Add Video
          </button>
        </div>
      </div>

      {/* Sync results panel */}
      {syncResults && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-blue-900">
              Google Drive Sync — {syncResults.filter((f) => f.isNew).length} new / {syncResults.filter((f) => !f.isNew).length} existing
            </h3>
            <div className="flex gap-2">
              <button onClick={() => void handleAddFromSync()} disabled={syncSelected.size === 0} className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-30 transition-colors">
                Add Selected ({syncSelected.size})
              </button>
              <button
                onClick={() => {
                  setSyncResults(null);
                  setSyncSelected(new Set());
                }}
                className="px-3 py-1 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {syncResults.map((file) => {
              const oversized = file.sizeBytes > MAX_VIDEO_SIZE_BYTES;
              return (
                <label key={file.fileId} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer ${file.isNew ? 'bg-white' : 'bg-blue-50/50 opacity-70'} ${oversized ? 'ring-1 ring-red-300' : ''}`}>
                  <input type="checkbox" checked={syncSelected.has(file.fileId)} onChange={() => toggleSyncSelect(file.fileId)} className="rounded border-blue-300" />
                  <span className="flex-1 font-medium text-neutral-800 truncate">{file.fileName}</span>
                  <span className={`text-xs ${oversized ? 'text-red-600 font-semibold' : 'text-neutral-500'}`}>
                    {formatBytes(file.sizeBytes)}
                    {oversized && ' (too large)'}
                  </span>
                  {file.durationSeconds && <span className="text-xs text-neutral-500">{formatDuration(file.durationSeconds)}</span>}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${file.isNew ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>{file.isNew ? 'new' : 'exists'}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="mb-6 p-4 bg-white border border-neutral-200 rounded-xl space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="File name" className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            <input type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Google Drive URL (optional)" className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            <input type="number" value={newDuration} onChange={(e) => setNewDuration(e.target.value)} placeholder="Duration (seconds)" className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => void handleAdd()} className="px-3 py-1.5 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800">
              Add
            </button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div className="mb-4">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search videos by name..." className="w-72 px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
      )}

      {videos.length === 0 ? (
        <div className="text-center py-16 text-neutral-400 bg-white border border-dashed border-neutral-200 rounded-xl">
          <p className="text-lg mb-2">No videos yet</p>
          <p className="text-sm">Sync from Google Drive or add videos manually</p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/80">
                <th className="pl-4 pr-2 py-3 text-left w-10">
                  <input type="checkbox" checked={selected.size === sortedVideos.length && sortedVideos.length > 0} onChange={toggleAll} className="rounded border-neutral-300" />
                </th>
                <th className="px-3 py-3 text-left font-semibold text-neutral-500 text-xs uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('fileName')}>
                  File Name <SortIcon col="fileName" />
                </th>
                <th className="px-3 py-3 text-left font-semibold text-neutral-500 text-xs uppercase tracking-wider cursor-pointer select-none w-28" onClick={() => handleSort('status')}>
                  Status <SortIcon col="status" />
                </th>
                <th className="px-3 py-3 text-left font-semibold text-neutral-500 text-xs uppercase tracking-wider cursor-pointer select-none w-36" onClick={() => handleSort('toolDetected')}>
                  Tool <SortIcon col="toolDetected" />
                </th>
                <th className="px-3 py-3 text-left font-semibold text-neutral-500 text-xs uppercase tracking-wider w-20">Size</th>
                <th className="px-3 py-3 text-left font-semibold text-neutral-500 text-xs uppercase tracking-wider cursor-pointer select-none w-24" onClick={() => handleSort('durationSeconds')}>
                  Duration <SortIcon col="durationSeconds" />
                </th>
                <th className="px-3 py-3 text-center font-semibold text-neutral-500 text-xs uppercase tracking-wider cursor-pointer select-none w-24" onClick={() => handleSort('segmentCount')}>
                  Segments <SortIcon col="segmentCount" />
                </th>
                <th className="px-3 py-3 text-right font-semibold text-neutral-500 text-xs uppercase tracking-wider w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedVideos.map((video) => {
                const isProcessing = processing.has(video._id) || video.status === 'processing';
                const isOversized = !!video.fileSizeBytes && video.fileSizeBytes > MAX_VIDEO_SIZE_BYTES;
                return (
                  <tr key={video._id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                    <td className="pl-4 pr-2 py-3">
                      <input type="checkbox" checked={selected.has(video._id)} onChange={() => toggleSelect(video._id)} className="rounded border-neutral-300" />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void navigate(`/admin/segments?video=${video._id}`);
                        }}
                        className="font-medium text-neutral-900 hover:text-purple-700 hover:underline text-left"
                      >
                        {video.fileName}
                      </button>
                      {video.sourceUrl && <div className="text-xs text-neutral-400 truncate max-w-[350px]">{video.sourceUrl}</div>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[video.status]}`}>
                        {isProcessing && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                        {video.status}
                      </span>
                      {video.error && (
                        <button onClick={() => setExpandedError(expandedError === video._id ? null : video._id)} className="block text-xs text-red-500 mt-1 hover:underline cursor-pointer text-left">
                          {expandedError === video._id ? video.error : 'Show error...'}
                        </button>
                      )}
                      {video.status === 'processed' && !video.cloudflareStreamUid && <span className="block text-xs text-amber-600 mt-1">CF upload missing</span>}
                      {video.cloudflareError && (
                        <button onClick={() => setExpandedError(expandedError === video._id ? null : video._id)} className="block text-xs text-amber-500 mt-0.5 hover:underline cursor-pointer text-left">
                          {expandedError === video._id ? video.cloudflareError : 'Show CF error...'}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {video.toolDetected ? (
                        <div>
                          <div className="text-xs font-semibold text-neutral-700">{video.toolDetected}</div>
                          {video.uiVersion && <div className="text-xs text-neutral-400 truncate max-w-[150px]">{video.uiVersion}</div>}
                        </div>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {video.fileSizeBytes ? (
                        <span className={video.fileSizeBytes > MAX_VIDEO_SIZE_BYTES ? 'text-red-600 font-medium' : 'text-neutral-600'}>
                          {formatBytes(video.fileSizeBytes)}
                          {video.fileSizeBytes > MAX_VIDEO_SIZE_BYTES && <span className="block text-[10px] text-red-500">over limit</span>}
                        </span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-neutral-600 tabular-nums">{video.durationSeconds ? formatDuration(video.durationSeconds) : '—'}</td>
                    <td className="px-3 py-3 text-center text-neutral-600 tabular-nums font-medium">{video.segmentCount || '—'}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => void handleProcess(video._id)}
                          disabled={isProcessing || isOversized}
                          className="p-1.5 text-neutral-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-30"
                          title={isOversized ? `Too large (max ${formatBytes(MAX_VIDEO_SIZE_BYTES)}). Split before processing.` : isProcessing ? 'Processing...' : 'Process video'}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                          </svg>
                        </button>
                        {video.status === 'processed' && !video.cloudflareStreamUid && (
                          <button
                            onClick={() => void handleUploadToCloudflare(video._id)}
                            disabled={uploading.has(video._id)}
                            className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-30"
                            title={uploading.has(video._id) ? 'Uploading to CF...' : 'Re-upload to Cloudflare'}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() =>
                            void (async () => {
                              if (!confirm(`Delete "${video.fileName}" and all its segments?`)) return;
                              try {
                                await removeVideo({ videoId: video._id });
                                toast.success('Video deleted');
                              } catch (e) {
                                toast.error('Delete failed: ' + (e instanceof Error ? e.message : 'Unknown'));
                              }
                            })()
                          }
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete video"
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
