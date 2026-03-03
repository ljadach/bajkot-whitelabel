import { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useParams, useNavigate } from 'react-router';

export function JoinOrganization() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'ready' | 'joining' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const acceptInvite = useMutation(api.organizations.acceptInvite);
  const currentOrg = useQuery(api.organizations.getCurrentOrganization);

  useEffect(() => {
    if (currentOrg !== undefined) {
      if (currentOrg !== null) {
        setError('You are already a member of an organization');
        setStatus('error');
      } else {
        setStatus('ready');
      }
    }
  }, [currentOrg]);

  const handleJoin = async () => {
    if (!token) return;

    setStatus('joining');
    setError(null);

    try {
      await acceptInvite({ inviteToken: token });
      setStatus('success');
      setTimeout(() => {
        void navigate('/team');
      }, 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to join organization');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 spinner mx-auto mb-4" />
            <p className="text-neutral-500">Loading...</p>
          </>
        )}

        {status === 'ready' && (
          <>
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-neutral-900 mb-2">Join Organization</h1>
            <p className="text-neutral-500 mb-6">You've been invited to join a team. Click below to accept the invitation.</p>
            <button onClick={() => void handleJoin()} className="w-full px-4 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors">
              Accept Invitation
            </button>
          </>
        )}

        {status === 'joining' && (
          <>
            <div className="w-12 h-12 spinner mx-auto mb-4" />
            <p className="text-neutral-500">Joining organization...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-neutral-900 mb-2">Welcome to the team!</h1>
            <p className="text-neutral-500">Redirecting to your team dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-neutral-900 mb-2">Unable to Join</h1>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => {
                void navigate('/');
              }}
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              Go to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
