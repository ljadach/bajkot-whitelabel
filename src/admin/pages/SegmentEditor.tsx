import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useSearchParams } from 'react-router';
import { Rnd } from 'react-rnd';
import { api } from '../../../convex/_generated/api';
import { toast } from 'sonner';
import type { Id } from '../../../convex/_generated/dataModel';
import { SegmentVideoPlayer } from '../components/SegmentVideoPlayer';

const PRESET_TAGS = ['redacted', 'check_again', 'unsure', 'verified', 'highlight'];
const PAGE_SIZES = [25, 50, 100];

const PLAYER_MIN_W = 320;
const PLAYER_MIN_H = 240;
const PLAYER_DEFAULT_W = 520;
const PLAYER_DEFAULT_H = 380;
const PLAYER_STORAGE_KEY = 'segment-player-pos';

function loadPlayerPos(): { x: number; y: number; width: number; height: number } {
  try {
    const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {
    x: window.innerWidth - PLAYER_DEFAULT_W - 24,
    y: window.innerHeight - PLAYER_DEFAULT_H - 24,
    width: PLAYER_DEFAULT_W,
    height: PLAYER_DEFAULT_H,
  };
}

function savePlayerPos(x: number, y: number, width: number, height: number) {
  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify({ x, y, width, height }));
}

export function SegmentEditor() {
  const videos = useQuery(api.admin.videos.list);
  const allSegments = useQuery(api.admin.segments.listAll);
  const toggleSegment = useMutation(api.admin.segments.toggle);
  const bulkToggle = useMutation(api.admin.segments.bulkToggle);
  const addTag = useMutation(api.admin.segments.addTag);
  const bulkAddTag = useMutation(api.admin.segments.bulkAddTag);
  const setTags = useMutation(api.admin.segments.setTags);
  const updateDescription = useMutation(api.admin.segments.updateDescription);
  const removeSegment = useMutation(api.admin.segments.remove);
  const bulkRemoveSegments = useMutation(api.admin.segments.bulkRemove);

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedVideo, setSelectedVideo] = useState<string>(searchParams.get('video') ?? 'all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [tagFilter, setTagFilter] = useState<string>('');
  const [enabledFilter, setEnabledFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewSegment, setPreviewSegment] = useState<string | null>(null);
  const [openTagMenu, setOpenTagMenu] = useState<string | null>(null);
  const [editingDesc, setEditingDesc] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const [playerMinimized, setPlayerMinimized] = useState(false);

  const videoMap = useMemo(() => {
    if (!videos) return new Map();
    return new Map(videos.map((v) => [v._id, v]));
  }, [videos]);

  const filteredSegments = useMemo(() => {
    if (!allSegments) return [];
    return allSegments.filter((seg) => {
      if (selectedVideo !== 'all' && seg.videoId !== selectedVideo) return false;
      if (tagFilter && !seg.tags.includes(tagFilter)) return false;
      if (enabledFilter === 'enabled' && !seg.enabled) return false;
      if (enabledFilter === 'disabled' && seg.enabled) return false;
      if (searchQuery.trim() && !seg.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [allSegments, selectedVideo, tagFilter, enabledFilter, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedVideo, tagFilter, enabledFilter, searchQuery, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredSegments.length / pageSize));
  const paginatedSegments = filteredSegments.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const tagCounts = useMemo(() => {
    if (!allSegments) return new Map<string, number>();
    const counts = new Map<string, number>();
    for (const seg of allSegments) {
      for (const t of seg.tags) counts.set(t, (counts.get(t) || 0) + 1);
    }
    return counts;
  }, [allSegments]);

  const allTags = useMemo(() => Array.from(tagCounts.keys()), [tagCounts]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === paginatedSegments.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginatedSegments.map((s) => s._id)));
    }
  };

  const handleBulkToggle = async (enabled: boolean) => {
    const ids = Array.from(selected) as Id<'videoSegments'>[];
    try {
      await bulkToggle({ segmentIds: ids, enabled });
      setSelected(new Set());
      toast.success(`${ids.length} segments ${enabled ? 'enabled' : 'disabled'}`);
    } catch (e) {
      toast.error('Bulk toggle failed: ' + (e instanceof Error ? e.message : 'Unknown'));
    }
  };

  const handleBulkTag = async (tag: string) => {
    const ids = Array.from(selected) as Id<'videoSegments'>[];
    try {
      await bulkAddTag({ segmentIds: ids, tag });
      toast.success(`Tag "${tag}" added to ${ids.length} segments`);
    } catch (e) {
      toast.error('Bulk tag failed: ' + (e instanceof Error ? e.message : 'Unknown'));
    }
  };

  const handleRemoveTag = async (segmentId: Id<'videoSegments'>, tagToRemove: string, currentTags: string[]) => {
    try {
      await setTags({ segmentId, tags: currentTags.filter((t) => t !== tagToRemove) });
    } catch (e) {
      toast.error('Failed to remove tag: ' + (e instanceof Error ? e.message : 'Unknown'));
    }
  };

  const handleSaveDescription = async (segmentId: Id<'videoSegments'>) => {
    try {
      await updateDescription({ segmentId, description: editValue });
      setEditingDesc(null);
      toast.success('Description updated');
    } catch (e) {
      toast.error('Failed to save: ' + (e instanceof Error ? e.message : 'Unknown'));
    }
  };

  const handleDelete = async (segmentId: Id<'videoSegments'>) => {
    try {
      await removeSegment({ segmentId });
      setConfirmDelete(null);
      if (previewSegment === segmentId) setPreviewSegment(null);
      selected.delete(segmentId);
      setSelected(new Set(selected));
      toast.success('Segment deleted');
    } catch (e) {
      toast.error('Delete failed: ' + (e instanceof Error ? e.message : 'Unknown'));
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected) as Id<'videoSegments'>[];
    try {
      await bulkRemoveSegments({ segmentIds: ids });
      setSelected(new Set());
      setConfirmBulkDelete(false);
      setPreviewSegment(null);
      toast.success(`${ids.length} segments deleted`);
    } catch (e) {
      toast.error('Bulk delete failed: ' + (e instanceof Error ? e.message : 'Unknown'));
    }
  };

  const activePreview = previewSegment ? allSegments?.find((s) => s._id === previewSegment) : null;
  const activePreviewVideo = activePreview ? videoMap.get(activePreview.videoId) : null;

  if (videos === undefined || allSegments === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 spinner" />
      </div>
    );
  }

  const processedVideos = videos.filter((v) => v.status === 'processed');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Segment Editor</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {filteredSegments.length} segments
            {selectedVideo !== 'all' && ` from ${videoMap.get(selectedVideo)?.fileName ?? 'unknown'}`}
            {filteredSegments.length !== allSegments.length && ` (${allSegments.length} total)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('compact')} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'compact' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>
              Compact
            </button>
            <button onClick={() => setViewMode('detailed')} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'detailed' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>
              Detailed
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          value={selectedVideo}
          onChange={(e) => {
            setSelectedVideo(e.target.value);
            if (e.target.value === 'all') {
              setSearchParams({});
            } else {
              setSearchParams({ video: e.target.value });
            }
          }}
          className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
        >
          <option value="all">All Videos</option>
          {processedVideos.map((v) => (
            <option key={v._id} value={v._id}>
              {v.fileName}
            </option>
          ))}
        </select>

        <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900">
          <option value="">All Tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t} ({tagCounts.get(t) || 0})
            </option>
          ))}
        </select>

        <select value={enabledFilter} onChange={(e) => setEnabledFilter(e.target.value)} className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900">
          <option value="all">All Status</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>

        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search descriptions..." className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 w-52" />

        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-neutral-500 font-medium">{selected.size} selected:</span>
            <button onClick={() => void handleBulkToggle(true)} className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              Enable
            </button>
            <button onClick={() => void handleBulkToggle(false)} className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
              Disable
            </button>
            {PRESET_TAGS.map((tag) => (
              <button key={tag} onClick={() => void handleBulkTag(tag)} className="px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg border border-neutral-200">
                +{tag}
              </button>
            ))}
            {confirmBulkDelete ? (
              <span className="inline-flex items-center gap-1">
                <button onClick={() => void handleBulkDelete()} className="px-2 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded">
                  Confirm delete {selected.size}
                </button>
                <button onClick={() => setConfirmBulkDelete(false)} className="px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 rounded">
                  Cancel
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirmBulkDelete(true)} className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded">
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Segment list */}
      {filteredSegments.length === 0 ? (
        <div className="text-center py-16 text-neutral-400 bg-white border border-dashed border-neutral-200 rounded-xl">
          <p>No segments match filters</p>
        </div>
      ) : viewMode === 'compact' ? (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/80">
                <th className="pl-4 pr-2 py-3 text-left w-10">
                  <input type="checkbox" checked={selected.size === paginatedSegments.length && paginatedSegments.length > 0} onChange={toggleAll} className="rounded border-neutral-300" />
                </th>
                <th className="px-3 py-3 text-left font-semibold text-neutral-500 text-xs uppercase tracking-wider w-28">Time</th>
                {selectedVideo === 'all' && <th className="px-3 py-3 text-left font-semibold text-neutral-500 text-xs uppercase tracking-wider w-48">Video</th>}
                <th className="px-3 py-3 text-left font-semibold text-neutral-500 text-xs uppercase tracking-wider">Description</th>
                <th className="px-3 py-3 text-left font-semibold text-neutral-500 text-xs uppercase tracking-wider w-44">Tags</th>
                <th className="px-3 py-3 text-center font-semibold text-neutral-500 text-xs uppercase tracking-wider w-20">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSegments.map((seg) => {
                const video = videoMap.get(seg.videoId);
                const isActive = previewSegment === seg._id;
                return (
                  <tr key={seg._id} onClick={() => setPreviewSegment(isActive ? null : seg._id)} className={`border-b border-neutral-50 cursor-pointer transition-colors ${isActive ? 'bg-purple-50' : seg.enabled ? 'hover:bg-neutral-50/50' : 'opacity-50 hover:opacity-70'}`}>
                    <td className="pl-4 pr-2 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(seg._id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(seg._id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-neutral-300"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-neutral-500 whitespace-nowrap">
                      {formatTime(seg.startSeconds)} – {formatTime(seg.endSeconds)}
                    </td>
                    {selectedVideo === 'all' && <td className="px-3 py-2.5 text-xs text-neutral-400 truncate max-w-[180px]">{video?.fileName}</td>}
                    <td className="px-3 py-2.5">
                      {editingDesc === seg._id ? (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 px-2 py-1 border border-neutral-300 rounded text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void handleSaveDescription(seg._id);
                              if (e.key === 'Escape') setEditingDesc(null);
                            }}
                          />
                          <button onClick={() => void handleSaveDescription(seg._id)} className="text-xs text-green-600 font-medium">
                            Save
                          </button>
                        </div>
                      ) : (
                        <p
                          className="text-sm text-neutral-700 truncate"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingDesc(seg._id);
                            setEditValue(seg.description);
                          }}
                          title={seg.description}
                        >
                          {seg.description}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 flex-wrap">
                        {seg.tags.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-600">
                            {tag}
                            <button onClick={() => void handleRemoveTag(seg._id, tag, seg.tags)} className="text-neutral-400 hover:text-red-500 ml-0.5">
                              x
                            </button>
                          </span>
                        ))}
                        <div className="relative">
                          <button onClick={() => setOpenTagMenu(openTagMenu === seg._id ? null : seg._id)} className="px-1 py-0.5 text-[10px] text-neutral-400 hover:text-neutral-600 border border-dashed border-neutral-200 rounded">
                            +
                          </button>
                          {openTagMenu === seg._id && (
                            <div className="absolute left-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-10">
                              {PRESET_TAGS.filter((t) => !seg.tags.includes(t)).map((tag) => (
                                <button
                                  key={tag}
                                  onClick={() =>
                                    void (async () => {
                                      setOpenTagMenu(null);
                                      try {
                                        await addTag({ segmentId: seg._id, tag });
                                      } catch (err) {
                                        toast.error('Tag failed: ' + (err instanceof Error ? err.message : 'Unknown'));
                                      }
                                    })()
                                  }
                                  className="block w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-50"
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() =>
                          void (async () => {
                            try {
                              await toggleSegment({ segmentId: seg._id, enabled: !seg.enabled });
                            } catch (err) {
                              toast.error('Toggle failed: ' + (err instanceof Error ? err.message : 'Unknown'));
                            }
                          })()
                        }
                        className={`shrink-0 w-9 h-5 rounded-full transition-colors ${seg.enabled ? 'bg-green-500' : 'bg-neutral-300'}`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${seg.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} style={{ transform: seg.enabled ? 'translateX(16px)' : 'translateX(2px)' }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Detailed card view */
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3 py-1">
            <input type="checkbox" checked={selected.size === paginatedSegments.length && paginatedSegments.length > 0} onChange={toggleAll} className="rounded border-neutral-300" />
            <span className="text-xs text-neutral-400">Select all on page</span>
          </div>

          {paginatedSegments.map((seg) => {
            const video = videoMap.get(seg.videoId);
            const isActive = previewSegment === seg._id;
            return (
              <div key={seg._id} className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${segmentCardStyle(isActive, seg.enabled)}`} onClick={() => setPreviewSegment(isActive ? null : seg._id)}>
                <input
                  type="checkbox"
                  checked={selected.has(seg._id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelect(seg._id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-neutral-300 mt-1"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-neutral-400">
                      {formatTime(seg.startSeconds)} – {formatTime(seg.endSeconds)}
                    </span>
                    {selectedVideo === 'all' && video && <span className="text-xs text-neutral-400 truncate">{video.fileName}</span>}
                  </div>

                  {editingDesc === seg._id ? (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-2 py-1 border border-neutral-300 rounded text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleSaveDescription(seg._id);
                          if (e.key === 'Escape') setEditingDesc(null);
                        }}
                      />
                      <button onClick={() => void handleSaveDescription(seg._id)} className="text-xs text-green-600">
                        Save
                      </button>
                    </div>
                  ) : (
                    <p
                      className="text-sm text-neutral-700 line-clamp-2"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingDesc(seg._id);
                        setEditValue(seg.description);
                      }}
                    >
                      {seg.description}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    {seg.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-neutral-100 text-neutral-600">
                        {tag}
                        <button onClick={() => void handleRemoveTag(seg._id, tag, seg.tags)} className="text-neutral-400 hover:text-red-500">
                          x
                        </button>
                      </span>
                    ))}
                    <div className="relative">
                      <button onClick={() => setOpenTagMenu(openTagMenu === seg._id ? null : seg._id)} className="px-1.5 py-0.5 text-xs text-neutral-400 hover:text-neutral-600 border border-dashed border-neutral-200 rounded">
                        + tag
                      </button>
                      {openTagMenu === seg._id && (
                        <div className="absolute left-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-10">
                          {PRESET_TAGS.filter((t) => !seg.tags.includes(t)).map((tag) => (
                            <button
                              key={tag}
                              onClick={() =>
                                void (async () => {
                                  setOpenTagMenu(null);
                                  try {
                                    await addTag({ segmentId: seg._id, tag });
                                  } catch (err) {
                                    toast.error('Tag failed: ' + (err instanceof Error ? err.message : 'Unknown'));
                                  }
                                })()
                              }
                              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-50"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void (async () => {
                          try {
                            await toggleSegment({ segmentId: seg._id, enabled: !seg.enabled });
                          } catch (err) {
                            toast.error('Toggle failed: ' + (err instanceof Error ? err.message : 'Unknown'));
                          }
                        })();
                      }}
                      className={`w-10 h-6 rounded-full transition-colors ${seg.enabled ? 'bg-green-500' : 'bg-neutral-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${seg.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                    {confirmDelete === seg._id ? (
                      <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => void handleDelete(seg._id)} className="px-1.5 py-0.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded">
                          Yes
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100 rounded">
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(seg._id);
                        }}
                        className="p-1 text-neutral-300 hover:text-red-500 rounded transition-colors"
                        title="Delete segment"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void (async () => {
                      try {
                        await toggleSegment({ segmentId: seg._id, enabled: !seg.enabled });
                      } catch (err) {
                        toast.error('Toggle failed: ' + (err instanceof Error ? err.message : 'Unknown'));
                      }
                    })();
                  }}
                  className={`shrink-0 w-10 h-6 rounded-full transition-colors ${seg.enabled ? 'bg-green-500' : 'bg-neutral-300'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${seg.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {filteredSegments.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">
              Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, filteredSegments.length)} of {filteredSegments.length}
            </span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="text-xs border border-neutral-200 rounded px-1.5 py-1 bg-white">
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0} className="px-2.5 py-1 text-xs font-medium border border-neutral-200 rounded-lg disabled:opacity-30 hover:bg-neutral-50 transition-colors">
              Prev
            </button>
            <span className="text-xs text-neutral-500 px-2">
              {currentPage + 1} / {totalPages}
            </span>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1} className="px-2.5 py-1 text-xs font-medium border border-neutral-200 rounded-lg disabled:opacity-30 hover:bg-neutral-50 transition-colors">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Floating draggable/resizable video preview panel */}
      {activePreview && (
        <Rnd
          default={loadPlayerPos()}
          minWidth={PLAYER_MIN_W}
          minHeight={playerMinimized ? undefined : PLAYER_MIN_H}
          bounds="window"
          dragHandleClassName="rnd-drag-handle"
          enableResizing={!playerMinimized}
          onDragStop={(_e, d) => {
            const el = d.node;
            savePlayerPos(d.x, d.y, el.offsetWidth, el.offsetHeight);
          }}
          onResizeStop={(_e, _dir, ref, _delta, pos) => {
            savePlayerPos(pos.x, pos.y, ref.offsetWidth, ref.offsetHeight);
          }}
          className="fixed z-50 shadow-2xl rounded-2xl border border-neutral-200 bg-white overflow-hidden flex flex-col"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          {/* Draggable header */}
          <div className="rnd-drag-handle flex items-center justify-between px-4 py-2.5 bg-neutral-50 border-b border-neutral-100 cursor-grab active:cursor-grabbing select-none shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-3.5 h-3.5 text-neutral-300 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="4" r="2" />
                <circle cx="12" cy="4" r="2" />
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="5" cy="20" r="2" />
                <circle cx="12" cy="20" r="2" />
              </svg>
              <span className="text-xs font-medium text-neutral-700 truncate">{activePreviewVideo?.fileName}</span>
              <span className="text-xs font-mono text-neutral-400 shrink-0">
                {formatTime(activePreview.startSeconds)} – {formatTime(activePreview.endSeconds)}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${activePreview.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{activePreview.enabled ? 'on' : 'off'}</span>
            </div>
            <div className="flex items-center gap-0.5 ml-2 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPlayerMinimized(!playerMinimized);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                title={playerMinimized ? 'Expand' : 'Minimize'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {playerMinimized ? <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />}
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewSegment(null);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content - hidden when minimized */}
          {!playerMinimized && (
            <>
              <div className="flex-1 min-h-0">
                <SegmentVideoPlayer
                  key={activePreview._id}
                  cloudflareStreamUid={activePreviewVideo?.cloudflareStreamUid}
                  cloudflareCustomerSubdomain={import.meta.env.VITE_CLOUDFLARE_CUSTOMER_SUBDOMAIN}
                  startSeconds={activePreview.startSeconds}
                  endSeconds={activePreview.endSeconds}
                />
              </div>
              {activePreview.metadata && (
                <div className="px-4 py-2 border-t border-neutral-100 max-h-24 overflow-auto shrink-0">
                  <pre className="text-xs text-neutral-500">{formatMetadata(activePreview.metadata)}</pre>
                </div>
              )}
            </>
          )}
        </Rnd>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function segmentCardStyle(isActive: boolean, enabled: boolean): string {
  if (isActive) return 'border-purple-300 bg-purple-50';
  if (enabled) return 'border-neutral-200 bg-white hover:border-neutral-300';
  return 'border-neutral-100 bg-neutral-50 opacity-60';
}

function formatMetadata(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
