import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SignInModal } from './SignInModal';

export function PublicNavMenu() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLang = 'pl';

  const isOnContact = location.pathname.includes('/about/contact');
  const isOnFaq = location.pathname.includes('/support/faq');
  const isOnFeedback = location.pathname === '/opinie' || location.pathname.endsWith('/opinie');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Menu"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-neutral-200 py-2 z-50 animate-fadeIn"
          role="menu"
        >
          <Link
            to={`/${currentLang}/`}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
            role="menuitem"
          >
            <svg
              className="w-4 h-4 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {t('home', 'Home')}
          </Link>

          <Link
            to="/book/order"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors font-medium"
            role="menuitem"
          >
            <svg
              className="w-4 h-4 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
            {t('createBook', 'Create a Book')}
          </Link>

          <div className="my-1 border-t border-neutral-100" />

          <Link
            to={`/${currentLang}/support/faq`}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isOnFaq ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'}`}
            role="menuitem"
          >
            <svg
              className="w-4 h-4 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            FAQ
          </Link>

          <Link
            to={`/${currentLang}/about/contact`}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isOnContact ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'}`}
            role="menuitem"
          >
            <svg
              className="w-4 h-4 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            {t('contact', 'Contact')}
          </Link>

          <Link
            to="/opinie"
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isOnFeedback ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'}`}
            role="menuitem"
          >
            <svg
              className="w-4 h-4 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 8h10M7 12h6m-6 4h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
              />
            </svg>
            {t('feedback', 'Opinie')}
          </Link>

          <div className="my-1 border-t border-neutral-100" />
          <button
            onClick={() => setShowSignIn(true)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 w-full"
            role="menuitem"
          >
            <svg
              className="w-4 h-4 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            {t('logIn', 'Log in')}
          </button>
        </div>
      )}
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </div>
  );
}
