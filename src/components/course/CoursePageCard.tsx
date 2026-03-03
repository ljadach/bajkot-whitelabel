import { StatusBadge } from './StatusBadge';

interface CoursePageCardProps {
  pageIndex: number;
  title: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  onClick: () => void;
}

export function CoursePageCard({ pageIndex, title, status, onClick }: CoursePageCardProps) {
  const isClickable = status === 'completed' || status === 'failed';

  return (
    <button onClick={onClick} disabled={!isClickable} className={`group relative w-full card p-5 text-left transition-all ${isClickable ? 'cursor-pointer hover:border-neutral-300 hover:shadow-sm' : 'cursor-default opacity-60'}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 text-sm font-medium text-neutral-700">{pageIndex + 1}</span>
        <StatusBadge status={status} />
      </div>

      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>

      {status === 'generating' && (
        <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
          <div className="h-3.5 w-3.5 spinner" />
          Generating handbook...
        </div>
      )}

      {status === 'completed' && <div className="mt-3 text-sm text-neutral-400 group-hover:text-neutral-600">Click to read more</div>}

      {status === 'failed' && <div className="mt-3 text-sm text-red-500">Generation failed. Click to retry.</div>}

      {status === 'pending' && <div className="mt-3 text-sm text-neutral-400">Waiting to start...</div>}
    </button>
  );
}
