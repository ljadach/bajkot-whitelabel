import { Suspense, lazy } from 'react';
import { Link } from 'react-router';
import { LANGUAGES, type SupportedLanguage } from '@/locales';
import i18n from 'i18next';
import { SegmentBreadcrumb } from './SegmentBreadcrumb';
import { ClientOnly } from './ClientOnly';

const LazyHeaderActions = lazy(() => import('./ClientAppShell').then((m) => ({ default: m.HeaderActions })));

function LanguageSwitcherStatic() {
  const lang = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;
  const current = LANGUAGES[lang] || LANGUAGES.en;
  return (
    <div className="p-2 rounded-lg text-neutral-500">
      <span className="text-lg">{current.flag}</span>
    </div>
  );
}

const headerFallback = (
  <div className="flex items-center gap-1">
    <LanguageSwitcherStatic />
  </div>
);

export function Header() {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-neutral-200">
      <div className="h-14 max-w-content mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-neutral-900 tracking-tight">AITutoro</span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded bg-orange-100 text-orange-600">Beta</span>
          </div>
        </Link>
        <ClientOnly fallback={headerFallback}>
          <Suspense fallback={headerFallback}>
            <LazyHeaderActions />
          </Suspense>
        </ClientOnly>
      </div>
      <SegmentBreadcrumb />
    </header>
  );
}
