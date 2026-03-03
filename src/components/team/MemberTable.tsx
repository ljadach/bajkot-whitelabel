import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface MemberTableProps {
  organizationId: Id<'organizations'>;
  canManage: boolean;
}

export function MemberTable({ organizationId, canManage }: MemberTableProps) {
  const members = useQuery(api.teamProgress.getTeamMemberProgress, { organizationId });
  const removeMember = useMutation(api.organizations.removeMember);
  const updateRole = useMutation(api.organizations.updateMemberRole);

  const allMembers = useQuery(api.organizations.getOrganizationMembers, { organizationId });

  if (members === undefined) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 spinner" />
        </div>
      </div>
    );
  }

  const handleRemove = async (clerkUserId: string) => {
    const member = allMembers?.find((m) => m.clerkUserId === clerkUserId);
    if (!member) return;

    if (confirm('Are you sure you want to remove this member?')) {
      await removeMember({ memberId: member._id });
    }
  };

  const handleRoleChange = async (clerkUserId: string, newRole: 'admin' | 'manager' | 'member') => {
    const member = allMembers?.find((m) => m.clerkUserId === clerkUserId);
    if (!member) return;

    await updateRole({ memberId: member._id, role: newRole });
  };

  const roleColors = {
    admin: 'bg-purple-100 text-purple-700',
    manager: 'bg-blue-100 text-blue-700',
    member: 'bg-neutral-100 text-neutral-600',
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="p-4 border-b border-neutral-100">
        <h2 className="text-lg font-semibold text-neutral-900">Team Members</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Member</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Role</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">Points</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">Progress</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">Streak</th>
              {canManage && <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {members.map((member) => (
              <tr key={member.clerkUserId} className="hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-neutral-600">{(member.displayName || member.clerkUserId).charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-neutral-900">{member.displayName || 'User'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleColors[member.role]}`}>{member.role}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-medium text-neutral-900">{member.points}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${member.completionPercent}%` }} />
                    </div>
                    <span className="text-xs text-neutral-500">{member.completionPercent}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {member.streakDays > 0 && (
                      <>
                        <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                        </svg>
                        <span className="text-sm text-neutral-600">{member.streakDays}d</span>
                      </>
                    )}
                    {member.streakDays === 0 && <span className="text-xs text-neutral-400">-</span>}
                  </div>
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <select value={member.role} onChange={(e) => void handleRoleChange(member.clerkUserId, e.target.value as 'admin' | 'manager' | 'member')} className="text-xs border border-neutral-200 rounded px-2 py-1 focus:ring-2 focus:ring-orange-500">
                        <option value="member">Member</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button onClick={() => void handleRemove(member.clerkUserId)} className="p-1 text-neutral-400 hover:text-red-500 transition-colors" title="Remove member">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {members.length === 0 && <div className="p-8 text-center text-neutral-500">No team members yet. Invite some!</div>}
    </div>
  );
}
