import { useEffect, useRef, useState } from 'react';

interface DebugDrawerProps {
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
  width?: number; // width in pixels
  onWidthChange?: (width: number) => void;
  children: React.ReactNode;
}

const MIN_WIDTH = 300;
const MAX_WIDTH = 1200;

export function DebugDrawer({ open = false, onOpenChange, width = 600, onWidthChange, children }: DebugDrawerProps) {
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onOpenChange?.(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      onWidthChange?.(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  if (!open) return null;

  return (
    <div ref={panelRef} className="relative h-full border-l border-gray-200 bg-white shadow-2xl flex flex-col" style={{ width: `${width}px` }} role="dialog" aria-label="Debug panel">
      {/* Resize handle - wider hit area for easier grabbing */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 group`}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        aria-label="Resize panel"
      >
        <div className={`absolute left-0 top-0 bottom-0 w-0.5 bg-gray-300 group-hover:w-1 group-hover:bg-blue-500 transition-all ${isResizing ? 'bg-blue-500 w-1' : ''}`} />
      </div>

      {/* Header */}
      <div className="relative flex items-center justify-between gap-3 border-b border-gray-200 px-3 py-2">
        <div className="text-sm font-medium text-gray-700">Debug</div>
        <div className="flex items-center gap-1">
          {/* Close */}
          <button className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800" onClick={() => onOpenChange?.(false)} aria-label="Close" title="Close">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </div>
  );
}
