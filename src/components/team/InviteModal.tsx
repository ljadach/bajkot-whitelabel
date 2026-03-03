import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface InviteModalProps {
  organizationId: Id<'organizations'>;
  onClose: () => void;
}

export function InviteModal({ organizationId, onClose }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'manager' | 'member'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inviteMember = useMutation(api.organizations.inviteMember);
  const cancelInvite = useMutation(api.organizations.cancelInvite);
  const pendingInvites = useQuery(api.organizations.getPendingInvites, { organizationId });

  const handleInvite = async () => {
    if (!email.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = await inviteMember({
        organizationId,
        email: email.trim(),
        role,
      });

      // Build invite link
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}/team/invite/${token}`);
      setEmail('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send invite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      void navigator.clipboard.writeText(inviteLink);
    }
  };

  const handleCancelInvite = async (inviteId: Id<'organizationInvites'>) => {
    await cancelInvite({ inviteId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <h2 className="text-lg font-semibold text-neutral-900">Invite Team Member</h2>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          {inviteLink ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">Invite created!</span>
                </div>
                <p className="text-xs text-green-700 mb-3">Share this link with your team member:</p>
                <div className="flex items-center gap-2">
                  <input type="text" readOnly value={inviteLink} className="flex-1 px-3 py-2 text-sm bg-white border border-green-300 rounded-lg" />
                  <button onClick={handleCopyLink} className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                    Copy
                  </button>
                </div>
              </div>
              <button onClick={() => setInviteLink(null)} className="w-full text-sm text-neutral-500 hover:text-neutral-700">
                Send another invite
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value as 'manager' | 'member')} className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                  <option value="member">Member - Can learn and complete exercises</option>
                  <option value="manager">Manager - Can view team progress and invite</option>
                </select>
              </div>
              <button onClick={() => void handleInvite()} disabled={!email.trim() || isSubmitting} className="w-full px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50">
                {isSubmitting ? 'Creating invite...' : 'Create Invite Link'}
              </button>
            </div>
          )}

          {/* Pending Invites */}
          {pendingInvites && pendingInvites.length > 0 && (
            <div className="mt-6 pt-4 border-t border-neutral-100">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Pending Invites</h3>
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div key={invite._id} className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded-lg">
                    <div>
                      <span className="text-sm text-neutral-700">{invite.email}</span>
                      <span className="ml-2 text-xs text-neutral-400">({invite.role})</span>
                    </div>
                    <button onClick={() => void handleCancelInvite(invite._id)} className="text-xs text-red-500 hover:text-red-700">
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100">
          <button onClick={onClose} className="w-full px-4 py-2 text-neutral-700 font-medium bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
