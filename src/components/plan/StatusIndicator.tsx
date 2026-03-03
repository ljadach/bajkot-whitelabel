export type DocumentStatus = 'pending' | 'generating' | 'completed' | 'failed';

interface StatusIndicatorProps {
  status: DocumentStatus;
  accent: string;
}

export function StatusIndicator({ status, accent }: StatusIndicatorProps) {
  if (status === 'completed') {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-green-600">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Ready
      </div>
    );
  }
  if (status === 'generating') {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: accent }}>
        <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: accent }} />
        Generating
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-red-500">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Failed
      </div>
    );
  }
  if (status === 'pending') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
        <div className="h-2 w-2 rounded-full bg-neutral-300" />
        Pending
      </div>
    );
  }
  return null;
}
