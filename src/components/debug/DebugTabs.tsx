import { Fragment } from 'react';

export type DebugTab = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
};

interface DebugTabsProps {
  tabs: DebugTab[];
  activeId: string;
  onChange: (id: string) => void;
}

// Microsoft Access–style tabs: rectangular, clear separators, subtle top accent
export function DebugTabs({ tabs, activeId, onChange }: DebugTabsProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Access-like tab strip */}
      <div className="flex items-end overflow-x-auto border-b border-gray-300 bg-gradient-to-b from-gray-50 to-white px-2 pt-2">
        {tabs.map((t) => {
          const active = t.id === activeId;
          return (
            <button
              key={t.id}
              className={`relative -mb-[1px] inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-x border-t px-4 py-2 text-sm font-medium transition
                ${active ? 'border-gray-300 bg-white text-gray-900' : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'}`}
              onClick={() => onChange(t.id)}
              role="tab"
              aria-selected={active}
            >
              {t.icon && <span className="text-gray-500">{t.icon}</span>}
              <span>{t.label}</span>
              {active && <span className="absolute inset-x-0 -top-0.5 h-0.5 rounded-t bg-gray-900" />}
              {/* Vertical separator look between tabs */}
              {!active && <span className="absolute right-[-1px] top-1/4 h-1/2 w-px bg-gray-200" aria-hidden />}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-auto p-4" role="tabpanel">
        {tabs.map((t) => (
          <Fragment key={t.id}>{activeId === t.id ? t.content : null}</Fragment>
        ))}
      </div>
    </div>
  );
}
