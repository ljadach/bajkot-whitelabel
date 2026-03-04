import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { toast } from 'sonner';

export function AdminConfig() {
  const configList = useQuery(api.admin.config.list);
  const setConfig = useMutation(api.admin.config.set);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (configList) {
      const map: Record<string, string> = {};
      for (const item of configList) {
        map[item.key] = item.value;
      }
      setValues(map);
    }
  }, [configList]);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(values)) {
        await setConfig({ key, value });
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
          <h1 className="text-2xl font-bold text-neutral-900">Configuration</h1>
          <p className="text-sm text-neutral-500 mt-1">System settings for Bajkot</p>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-5 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {configList.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 text-sm text-neutral-500">
          No configuration entries yet.
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          {configList.map((item) => (
            <div key={item.key}>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{item.key}</label>
              <input
                type="text"
                value={values[item.key] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [item.key]: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
