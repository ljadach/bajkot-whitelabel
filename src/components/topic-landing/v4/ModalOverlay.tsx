import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Shared modal plumbing: portal to body, backdrop-click + Escape to close.
 * Rendered only after user interaction, so it is client-only by construction.
 */
export function ModalOverlay({
  onClose,
  label,
  className = '',
  children,
}: {
  onClose: () => void;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={`fixed inset-0 z-[100] bg-slate-900/90 ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
