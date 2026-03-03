import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { MemberTable } from './MemberTable';
import { InviteModal } from './InviteModal';
import { Leaderboard } from './Leaderboard';

export function TeamDashboard() {
  const [showInviteModal, setShowInviteModal] = useState(false);

  const org = useQuery(api.organizations.getCurrentOrganization);
  const stats = useQuery(api.teamProgress.getTeamDashboard, org ? { organizationId: org._id } : 'skip');

  if (org === undefined) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-neutral-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="w-6 h-6 spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (org === null) {
    return <NoOrganization />;
  }

  const canManage = org.role === 'admin' || org.role === 'manager';

  return (
    <div className="min-h-[calc(100vh-56px)] bg-neutral-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-neutral-900">{org.name}</h1>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-neutral-100 text-neutral-600">{org.memberCount} members</span>
            </div>
            <p className="text-neutral-500">Team learning dashboard</p>
          </div>
          {canManage && (
            <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Invite Member
            </button>
          )}
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Active Members" value={`${stats.activeMembers}/${stats.totalMembers}`} sublabel="last 7 days" color="green" />
            <StatCard label="Total Points" value={stats.totalPoints} color="amber" />
            <StatCard label="Exercises Done" value={stats.totalExercises} color="blue" />
            <StatCard label="Avg Completion" value={`${stats.avgCompletionPercent}%`} color="orange" />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Members Table */}
          <div className="lg:col-span-2">
            <MemberTable organizationId={org._id} canManage={canManage} />
          </div>

          {/* Leaderboard */}
          <div>
            <Leaderboard organizationId={org._id} />
          </div>
        </div>

        {/* Invite Modal */}
        {showInviteModal && <InviteModal organizationId={org._id} onClose={() => setShowInviteModal(false)} />}
      </div>
    </div>
  );
}

// ============================================
// No Organization View
// ============================================

function NoOrganization() {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createOrganization = useMutation(api.organizations.createOrganization);

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) return;

    setError(null);
    try {
      await createOrganization({ name: name.trim(), slug: slug.trim().toLowerCase() });
      // Page will rerender with the new organization
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create organization');
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-neutral-50">
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">Team Management</h1>
          <p className="text-neutral-500">Create or join an organization to track your team's learning progress.</p>
        </div>

        {!isCreating ? (
          <div className="space-y-4">
            <button onClick={() => setIsCreating(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Organization
            </button>
            <p className="text-center text-sm text-neutral-400">Or ask your team admin for an invite link</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Create Organization</h2>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Organization Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) setSlug(generateSlug(e.target.value));
                  }}
                  placeholder="Acme Corp"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">URL Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-400">/team/</span>
                  <input type="text" value={slug} onChange={(e) => setSlug(generateSlug(e.target.value))} placeholder="acme-corp" className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsCreating(false)} className="flex-1 px-4 py-2 text-neutral-700 font-medium bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors">
                  Cancel
                </button>
                <button onClick={() => void handleCreate()} disabled={!name.trim() || !slug.trim()} className="flex-1 px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50">
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Stat Card
// ============================================

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  color: 'amber' | 'green' | 'blue' | 'orange';
}

const colorClasses = {
  amber: 'bg-amber-50 border-amber-200',
  green: 'bg-green-50 border-green-200',
  blue: 'bg-blue-50 border-blue-200',
  orange: 'bg-orange-50 border-orange-200',
};

function StatCard({ label, value, sublabel, color }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <span className="text-sm text-neutral-500">{label}</span>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold text-neutral-900">{value}</span>
        {sublabel && <span className="text-xs text-neutral-400">{sublabel}</span>}
      </div>
    </div>
  );
}
