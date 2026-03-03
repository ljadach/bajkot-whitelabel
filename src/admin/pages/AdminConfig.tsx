import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { toast } from 'sonner';

interface ConfigSection {
  title: string;
  description: string;
  keys: ConfigKeyDef[];
  columns?: 1 | 2;
}

interface ConfigKeyDef {
  key: string;
  label: string;
  placeholder: string;
  description: string;
  isToggle?: boolean;
  isCorpusSelect?: boolean;
  options?: Array<{ value: string; label: string }>;
}

const CONFIG_SECTIONS: ConfigSection[] = [
  {
    title: 'Source',
    description: 'Where to find video content',
    columns: 1,
    keys: [
      {
        key: 'google_drive_url',
        label: 'Google Drive Folder URL',
        placeholder: 'https://drive.google.com/drive/folders/...',
        description: 'URL of the Google Drive folder containing video recordings',
      },
    ],
  },
  {
    title: 'Model',
    description: 'LLM used for video analysis',
    columns: 1,
    keys: [
      {
        key: 'llm_model',
        label: 'LLM Model for Processing',
        placeholder: 'gemini-2.0-flash-001',
        description: 'Gemini model used for video-to-segment analysis (must support video input)',
      },
    ],
  },
  {
    title: 'Extraction Mode',
    description: 'What type of segments to extract from videos',
    columns: 1,
    keys: [
      {
        key: 'extraction_mode',
        label: 'Segment Extraction Mode',
        placeholder: 'interactions',
        description: 'Interactions: atomic clicks/types (0.3-120s). Teaching: workflow segments (5-60s).',
        options: [
          { value: 'interactions', label: 'Interactions (atomic clicks/types)' },
          { value: 'teaching', label: 'Teaching (workflow segments 5-60s)' },
        ],
      },
    ],
  },
  {
    title: 'Processing Parameters',
    description: 'Control how videos are segmented',
    columns: 2,
    keys: [
      {
        key: 'min_segment_duration',
        label: 'Min Segment Duration (s)',
        placeholder: '0.3',
        description: 'Minimum duration for a segment',
      },
      {
        key: 'max_segment_duration',
        label: 'Max Segment Duration (s)',
        placeholder: '120',
        description: 'Maximum duration for a segment',
      },
      {
        key: 'processing_chunk_minutes',
        label: 'Chunk Size (min)',
        placeholder: '5',
        description: 'Max video chunk per LLM request',
      },
      {
        key: 'processing_overlap_seconds',
        label: 'Chunk Overlap (s)',
        placeholder: '30',
        description: 'Overlap between consecutive chunks',
      },
    ],
  },
];

export function AdminConfig() {
  const configList = useQuery(api.admin.config.list);
  const corpora = useQuery(api.admin.corpus.list);
  const setConfig = useMutation(api.admin.config.set);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (configList) {
      const map: Record<string, string> = {};
      for (const item of configList) {
        map[item.key] = item.value;
      }
      // Initialize defaults for option-based fields not yet in DB
      for (const section of CONFIG_SECTIONS) {
        for (const cfg of section.keys) {
          if (cfg.options && !map[cfg.key]) {
            map[cfg.key] = cfg.options[0]?.value ?? '';
          }
        }
      }
      setValues(map);
    }
  }, [configList]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const allKeys = CONFIG_SECTIONS.flatMap((s) => s.keys);
      for (const cfg of allKeys) {
        const val = values[cfg.key];
        if (val !== undefined) {
          await setConfig({ key: cfg.key, value: val });
        }
      }
      toast.success('Configuration saved');
    } catch (e) {
      toast.error('Failed to save: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (configList === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Pipeline Configuration</h1>
          <p className="text-sm text-neutral-500 mt-1">Processing parameters for the content pipeline</p>
        </div>
        <button onClick={() => void handleSave()} disabled={saving} className="px-5 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <div className="space-y-8">
        {CONFIG_SECTIONS.map((section) => (
          <div key={section.title} className="bg-white border border-neutral-200 rounded-xl p-6">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-neutral-900">{section.title}</h2>
              <p className="text-xs text-neutral-400 mt-0.5">{section.description}</p>
            </div>
            <div className={`grid gap-5 ${section.columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
              {section.keys.map((cfg) => (
                <div key={cfg.key}>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">{cfg.label}</label>
                  {cfg.isToggle ? (
                    <button
                      type="button"
                      onClick={() =>
                        setValues((prev) => ({
                          ...prev,
                          [cfg.key]: prev[cfg.key] === 'true' ? 'false' : 'true',
                        }))
                      }
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${values[cfg.key] === 'true' ? 'bg-green-500' : 'bg-neutral-300'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${values[cfg.key] === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  ) : cfg.isCorpusSelect ? (
                    <select
                      value={values[cfg.key] ?? ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [cfg.key]: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    >
                      <option value="">No corpus (text-only)</option>
                      {corpora?.map((c) => (
                        <option key={c._id} value={c._id}>
                          v{c.version} — {c.name} ({c.segmentCount} segments)
                        </option>
                      ))}
                    </select>
                  ) : cfg.options ? (
                    <select
                      value={values[cfg.key] ?? cfg.options[0]?.value ?? ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [cfg.key]: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    >
                      {cfg.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={values[cfg.key] ?? ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [cfg.key]: e.target.value }))}
                      placeholder={cfg.placeholder}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    />
                  )}
                  <p className="mt-1.5 text-xs text-neutral-400">{cfg.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
