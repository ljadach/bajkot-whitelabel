import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SEGMENT_CONFIG } from '../pages/segmentConfig';
import { SignInModal } from './SignInModal';

const SOLUTIONS = [
  { slug: SEGMENT_CONFIG.business.slug, labelKey: 'nav.forBusiness' },
  { slug: SEGMENT_CONFIG.edu.slug, labelKey: 'nav.forEducation' },
  { slug: SEGMENT_CONFIG.executive.slug, labelKey: 'nav.forExecutive' },
  { slug: SEGMENT_CONFIG.individuals.slug, labelKey: 'nav.forIndividuals' },
];

export function PublicNavMenu() {
  const { t, i18n } = useTranslation('segment-common');
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Extract current language from URL or fall back to i18n
  const langMatch = location.pathname.match(/^\/(en|pl|de)(\/|$)/);
  const currentLang = langMatch ? langMatch[1] : i18n.language?.split('-')[0] || 'en';

  // Check if we're on a segment landing page or pricing
  const isOnLandingPage = SOLUTIONS.some((s) => location.pathname.includes(s.slug));
  const isOnPricing = location.pathname.endsWith('/pricing');
  const isOnContact = location.pathname.includes('/about/contact');
  const isOnFaq = location.pathname.includes('/support/faq');
  const isOnAiTools = location.pathname.includes('/ai-tools');

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
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

  // Close menu on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <div ref={menuRef} className="relative">
      {/* Burger button */}
      <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors" aria-expanded={isOpen} aria-haspopup="true" aria-label="Menu">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {isOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-neutral-200 py-2 z-50 animate-fadeIn" role="menu">
          {/* AITutoro link - only show when on a landing page or pricing */}
          {(isOnLandingPage || isOnPricing || isOnContact || isOnFaq || isOnAiTools) && (
            <>
              <Link to={`/${currentLang}/`} className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors" role="menuitem">
                <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                AITutoro
              </Link>
              <div className="my-1 border-t border-neutral-100" />
            </>
          )}

          {/* Solutions section */}
          <div className="px-4 py-1.5">
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">{t('nav.solutions', 'Solutions')}</span>
          </div>
          {SOLUTIONS.map((item) => (
            <Link
              key={item.slug}
              to={`/${currentLang}/${item.slug}`}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${location.pathname.includes(item.slug) ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'}`}
              role="menuitem"
            >
              <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              {t(item.labelKey, item.slug)}
            </Link>
          ))}

          {/* Pricing link */}
          <div className="my-1 border-t border-neutral-100" />
          <Link to={`/${currentLang}/pricing`} className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isOnPricing ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'}`} role="menuitem">
            <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {t('nav.pricing', 'Pricing')}
          </Link>

          {/* AI Tools link */}
          <Link to={`/${currentLang}/ai-tools`} className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isOnAiTools ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'}`} role="menuitem">
            <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a3.167 3.167 0 01-4.474-4.474L19 14.5zm-14 0l2.47 2.47a3.167 3.167 0 004.474-4.474L5 14.5z"
              />
            </svg>
            {t('nav.aiTools', 'AI Tools')}
          </Link>

          {/* FAQ link */}
          <Link to={`/${currentLang}/support/faq`} className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isOnFaq ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'}`} role="menuitem">
            <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('nav.faq', 'FAQ')}
          </Link>

          {/* Contact link */}
          <Link to={`/${currentLang}/about/contact`} className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isOnContact ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'}`} role="menuitem">
            <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {t('nav.contact', 'Contact')}
          </Link>

          {/* Login */}
          <div className="my-1 border-t border-neutral-100" />
          <button onClick={() => setShowSignIn(true)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 w-full" role="menuitem">
            <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {t('nav.login', 'Log in')}
          </button>
        </div>
      )}
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </div>
  );
}
