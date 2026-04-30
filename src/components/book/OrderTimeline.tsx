import { useEffect, useRef } from 'react';
import type { Id } from '../../../convex/_generated/dataModel';

type PipelineEvent = {
  _id: Id<'bookPipelineEvents'>;
  _creationTime: number;
  orderId: Id<'bookOrders'>;
  agent: string;
  event: string;
  narrative: string;
  details?: string;
  timestamp: number;
};

const DOT_COLORS: Record<string, string> = {
  complete: 'bg-emerald-400',
  start: 'bg-blue-400',
  error: 'bg-red-400',
  retry: 'bg-amber-400',
  info: 'bg-neutral-400',
};

const DOT_RING_COLORS: Record<string, string> = {
  complete: 'ring-emerald-400/30',
  start: 'ring-blue-400/30',
  error: 'ring-red-400/30',
  retry: 'ring-amber-400/30',
  info: 'ring-neutral-400/30',
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 0) return 'teraz';

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s temu`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min temu`;

  // More than 1 hour — show absolute time
  const date = new Date(timestamp);
  return date.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrderTimeline({
  events,
  compact = false,
  showAgentBadge = true,
}: {
  events: PipelineEvent[] | undefined;
  compact?: boolean;
  /** Hide the `A1/A2/...` debug badges in parent-facing progress views. */
  showAgentBadge?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events?.length]);

  if (!events) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 spinner" />
      </div>
    );
  }

  if (events.length === 0) {
    return <div className="py-6 text-center text-sm text-neutral-500">Brak wydarzeń pipeline</div>;
  }

  const maxHeight = compact ? 'max-h-64' : 'max-h-[480px]';

  return (
    <div
      ref={scrollRef}
      className={`${maxHeight} overflow-y-auto rounded-xl bg-neutral-950 p-4 scrollbar-thin`}
    >
      <div className="relative pl-6">
        {/* Timeline vertical line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-neutral-700" />

        <div className="space-y-3">
          {events.map((ev, index) => {
            const isLast = index === events.length - 1;
            const isActive = isLast && ev.event === 'start';
            const dotColor = DOT_COLORS[ev.event] ?? 'bg-neutral-500';
            const ringColor = DOT_RING_COLORS[ev.event] ?? 'ring-neutral-500/30';

            return (
              <div key={ev._id} className="relative flex items-start gap-3">
                {/* Dot on timeline */}
                <div
                  className={`absolute -left-6 top-1 flex h-3.5 w-3.5 items-center justify-center`}
                >
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${dotColor} ${
                      isActive ? 'animate-pulse ring-4 ' + ringColor : ''
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Agent badge (admin only) */}
                    {showAgentBadge && (
                      <span className="inline-flex items-center rounded-md bg-neutral-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-neutral-300">
                        {ev.agent}
                      </span>
                    )}

                    {/* Narrative */}
                    <span
                      className={`text-sm ${
                        ev.event === 'error'
                          ? 'text-red-400'
                          : ev.event === 'complete'
                            ? 'text-emerald-300'
                            : ev.event === 'retry'
                              ? 'text-amber-300'
                              : 'text-neutral-200'
                      }`}
                    >
                      {ev.narrative}
                    </span>

                    {/* Timestamp */}
                    <span className="ml-auto shrink-0 text-[10px] text-neutral-600">
                      {formatRelativeTime(ev.timestamp)}
                    </span>
                  </div>

                  {/* Expandable details */}
                  {ev.details && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[11px] text-neutral-500 hover:text-neutral-400">
                        szczegoly
                      </summary>
                      <pre className="mt-1 rounded-md bg-neutral-900 px-2 py-1.5 text-[11px] text-neutral-400 overflow-x-auto whitespace-pre-wrap">
                        {ev.details}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
