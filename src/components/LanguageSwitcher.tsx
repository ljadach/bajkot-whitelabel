import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { LANGUAGES, type SupportedLanguage } from '@/locales';

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const updateProfile = useMutation(api.profiles.createOrUpdateProfile);

  const currentLang = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;
  const currentLanguage = LANGUAGES[currentLang] || LANGUAGES.en;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = async (langCode: SupportedLanguage) => {
    // Update i18n immediately for instant UI switch
    await i18n.changeLanguage(langCode);

    // Store in localStorage for persistence
    localStorage.setItem('preferredLanguage', langCode);

    // Set cookie for Vercel Edge Middleware language routing
    document.cookie = `lang=${langCode}; path=/; max-age=31536000; SameSite=Lax`;

    // If on a public page with lang prefix, navigate to equivalent URL
    const match = location.pathname.match(/^\/(en|pl|de)(\/.*)?$/);
    if (match) {
      const rest = match[2] || '/';
      void navigate(`/${langCode}${rest}`);
    }

    // Update profile in database (for LLM calls)
    try {
      await updateProfile({ preferredLanguage: langCode });
    } catch (error) {
      // Profile update may fail if not authenticated, that's ok
      console.debug('Could not update profile language:', error);
    }

    setIsOpen(false);
  };

  if (compact) {
    return (
      <div ref={dropdownRef} className="relative">
        <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1 p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors" title={currentLanguage.name}>
          <span className="text-lg">{currentLanguage.flag}</span>
          <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50">
            {(Object.entries(LANGUAGES) as [SupportedLanguage, (typeof LANGUAGES)[SupportedLanguage]][]).map(([code, lang]) => (
              <button
                key={code}
                onClick={() => void handleLanguageChange(code)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-neutral-50 transition-colors ${code === currentLang ? 'bg-neutral-50 text-neutral-900 font-medium' : 'text-neutral-600'}`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.nativeName}</span>
                {code === currentLang && (
                  <svg className="w-4 h-4 ml-auto text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full version with text
  return (
    <div ref={dropdownRef} className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-colors">
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="text-sm text-neutral-700">{currentLanguage.nativeName}</span>
        <svg className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-50">
          {(Object.entries(LANGUAGES) as [SupportedLanguage, (typeof LANGUAGES)[SupportedLanguage]][]).map(([code, lang]) => (
            <button key={code} onClick={() => void handleLanguageChange(code)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-neutral-50 transition-colors ${code === currentLang ? 'bg-neutral-50' : ''}`}>
              <span className="text-xl">{lang.flag}</span>
              <div className="flex-1">
                <div className={`text-sm ${code === currentLang ? 'text-neutral-900 font-medium' : 'text-neutral-700'}`}>{lang.nativeName}</div>
                <div className="text-xs text-neutral-400">{lang.name}</div>
              </div>
              {code === currentLang && (
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
