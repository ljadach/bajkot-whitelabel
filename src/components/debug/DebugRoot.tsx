import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { DebugDrawer } from './DebugDrawer';
import { DebugTabs, type DebugTab } from './DebugTabs';
import { DebugTabApp } from './DebugTabApp';
import { DebugTabBackendLogs } from './DebugTabBackendLogs';
import { DebugTabConfig } from './DebugTabConfig';
import { DebugTabLlmLogs } from './DebugTabLlmLogs';
import { DebugTabPrompts } from './DebugTabPrompts';

export interface DebugRootProps {
  tabs?: DebugTab[];
  defaultOpen?: boolean;
}

function useLocalStorageBoolean(key: string, initial: boolean) {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(key);
      return v === null ? initial : v === '1';
    } catch (error) {
      console.warn('Failed to read debug state', error);
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, value ? '1' : '0');
    } catch (error) {
      console.warn('Failed to persist debug state', error);
    }
  }, [key, value]);
  return [value, setValue] as const;
}

function useLocalStorageNumber(key: string, initial: number) {
  const [value, setValue] = useState<number>(() => {
    try {
      const v = localStorage.getItem(key);
      if (v === null) return initial;
      const parsed = parseInt(v, 10);
      return isNaN(parsed) ? initial : parsed;
    } catch (error) {
      console.warn('Failed to read from localStorage', error);
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, value.toString());
    } catch (error) {
      console.warn('Failed to persist to localStorage', error);
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export function DebugRoot({ tabs, defaultOpen = false }: DebugRootProps) {
  // Only render for admins
  const isAdmin = useQuery(api.auth.isAdmin);

  const [open, setOpen] = useLocalStorageBoolean('dbg:open', defaultOpen);
  const [width, setWidth] = useLocalStorageNumber('dbg:width', 600);
  const [activeId, setActiveId] = useState<string>('app');

  const defaultTabs: DebugTab[] = useMemo(
    () => [
      { id: 'app', label: 'Session', content: <DebugTabApp /> },
      { id: 'config', label: 'Config', content: <DebugTabConfig /> },
      { id: 'llm', label: 'LLM Logs', content: <DebugTabLlmLogs /> },
      { id: 'backend', label: 'Backend Logs', content: <DebugTabBackendLogs /> },
      { id: 'prompts', label: 'Prompts', content: <DebugTabPrompts /> },
    ],
    []
  );

  const effectiveTabs = tabs && tabs.length > 0 ? tabs : defaultTabs;

  useEffect(() => {
    if (!effectiveTabs.find((t) => t.id === activeId)) {
      setActiveId(effectiveTabs[0]?.id || 'app');
    }
  }, [effectiveTabs, activeId]);

  // Don't render anything if not admin (or still loading)
  if (!isAdmin) {
    return null;
  }

  return (
    <>
      {/* Collapsed handle at bottom-right (always visible) */}
      <button
        type="button"
        className="fixed bottom-3 right-3 z-40 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur hover:bg-white"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Hide debug' : 'Show debug'}
        title={open ? 'Hide debug' : 'Show debug'}
      >
        <svg className="h-3.5 w-3.5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {open ? 'Hide' : 'Debug'}
      </button>

      {/* Right panel */}
      <DebugDrawer open={open} onOpenChange={setOpen} width={width} onWidthChange={setWidth}>
        <DebugTabs tabs={effectiveTabs} activeId={activeId} onChange={setActiveId} />
      </DebugDrawer>
    </>
  );
}
