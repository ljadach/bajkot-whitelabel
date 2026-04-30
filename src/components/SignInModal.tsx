import { SignIn } from '@clerk/clerk-react';
import { useEffect } from 'react';

interface SignInModalProps {
  onClose: () => void;
  /**
   * Optional URL/path to navigate to after a successful sign-in.
   * Forwarded to Clerk's `SignIn` via `forceRedirectUrl`.
   */
  redirectUrl?: string;
}

export function SignInModal({ onClose, redirectUrl }: SignInModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Logowanie"
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex min-h-full items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <SignIn routing="hash" forceRedirectUrl={redirectUrl} />
      </div>
    </div>
  );
}
