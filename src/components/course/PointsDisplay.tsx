import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export function PointsDisplay() {
  const points = useQuery(api.exercises.getUserPoints);

  if (!points || points.totalPoints === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200" title="Points earned from exercises">
      <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      <span className="text-sm font-semibold text-amber-700">{points.totalPoints}</span>
      <span className="text-xs text-amber-600">pts</span>
    </div>
  );
}
