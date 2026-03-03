import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface LeaderboardProps {
  organizationId: Id<'organizations'>;
}

export function Leaderboard({ organizationId }: LeaderboardProps) {
  const leaderboard = useQuery(api.teamProgress.getTeamLeaderboard, {
    organizationId,
    limit: 10,
  });

  if (leaderboard === undefined) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 spinner" />
        </div>
      </div>
    );
  }

  const rankColors = ['text-amber-500', 'text-neutral-400', 'text-amber-700'];
  const rankBgColors = ['bg-amber-50', 'bg-neutral-50', 'bg-amber-50/50'];

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="p-4 border-b border-neutral-100 flex items-center gap-2">
        <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <h2 className="text-lg font-semibold text-neutral-900">Leaderboard</h2>
      </div>

      {leaderboard.length === 0 ? (
        <div className="p-8 text-center text-neutral-500">No points earned yet. Complete exercises to appear here!</div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {leaderboard.map((entry, index) => (
            <div key={entry.clerkUserId} className={`flex items-center gap-3 p-4 ${index < 3 ? rankBgColors[index] : ''}`}>
              {/* Rank */}
              <div className={`w-6 text-center font-bold ${index < 3 ? rankColors[index] : 'text-neutral-400'}`}>{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : entry.rank}</div>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-neutral-600">{(entry.displayName || entry.clerkUserId).charAt(0).toUpperCase()}</span>
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-neutral-900 truncate block">{entry.displayName || 'User'}</span>
                <span className="text-xs text-neutral-400">{entry.exercisesCompleted} exercises</span>
              </div>

              {/* Points */}
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-sm font-bold text-neutral-900">{entry.points}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
