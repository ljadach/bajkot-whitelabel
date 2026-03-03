/**
 * ShareSessionButton - Component for sharing current session via URL
 *
 * Generates a shareable token and copies the URL to clipboard.
 * Allows users to continue their session on different devices.
 */

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import { useSessionToken } from '../hooks/useSessionToken';
import { Spinner } from './common/Spinner';

interface ShareSessionButtonProps {
  /** Custom button text (default: "Share Progress") */
  buttonText?: string;

  /** Custom button className */
  className?: string;

  /** Callback after successful share */
  onShare?: (url: string) => void;

  /** Compact mode - icon only (default: false) */
  compact?: boolean;
}

export function ShareSessionButton({ buttonText = 'Share Progress', className = '', onShare, compact = false }: ShareSessionButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const createToken = useMutation(api.sessions.createShareableToken);
  const { getShareableUrl } = useSessionToken();

  const handleShare = async () => {
    try {
      setIsGenerating(true);

      // Generate shareable token
      const token = await createToken();

      // Build shareable URL
      const url = getShareableUrl(token);

      // Copy to clipboard
      await navigator.clipboard.writeText(url);

      // Show success toast
      if (compact) {
        toast.success('Session bookmark copied');
      } else {
        toast.success('Link copied to clipboard', {
          description: 'You can now open this session on any device.',
          duration: 4000,
        });
      }

      // Call callback if provided
      onShare?.(url);
    } catch (error) {
      console.error('Failed to share session:', error);
      toast.error('Failed to generate share link', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (compact) {
    return (
      <button onClick={() => void handleShare()} disabled={isGenerating} className={`btn-icon ${className}`} aria-label="Share session progress" title="Copy session bookmark">
        {isGenerating ? (
          <Spinner size="sm" />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button onClick={() => void handleShare()} disabled={isGenerating} className={`btn-primary ${className}`} aria-label="Share session progress">
      {isGenerating ? (
        <>
          <Spinner size="sm" />
          Generating...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          {buttonText}
        </>
      )}
    </button>
  );
}
