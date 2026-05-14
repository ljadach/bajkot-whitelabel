import { Suspense, lazy, type ReactNode } from 'react';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useLocation,
  useRouteError,
} from 'react-router';
import { Toaster } from 'sonner';
import './index.css';
import './lib/i18n';

import { useEffect } from 'react';
import { Header } from './components/Header';
import { ClientOnly } from './components/ClientOnly';
import { ScrollToTop } from './components/ScrollToTop';
import { useLangFromUrl } from './hooks/useLangFromUrl';
import { captureTokenFromUrl } from './hooks/useAccessToken';
import { GA_MEASUREMENT_ID, trackGaPageview } from './lib/gtag';

const LazyClientUtilities = lazy(() =>
  import('./components/ClientAppShell').then((m) => ({ default: m.ClientUtilities })),
);

export function Layout({ children }: { children: ReactNode }) {
  const lang = useLangFromUrl();

  return (
    <html lang={lang}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Special+Elite&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Bajkoterapia" />
        <meta property="og:image" content="https://bajkoterapia.org/android-chrome-512x512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://bajkoterapia.org/android-chrome-512x512.png" />
        <Meta />
        <Links />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Bajkoterapia',
              url: 'https://bajkoterapia.org',
              logo: 'https://bajkoterapia.org/android-chrome-512x512.png',
              description:
                'Personalized therapeutic storybooks for children. AI-generated stories that help kids process emotions.',
            }),
          }}
        />
        {/* Google Analytics 4 + Consent Mode v2 — defaults to denied so
            nothing fires until the user accepts in CookieBanner. The
            `setAnalyticsConsent` helper flips analytics_storage to 'granted'
            when consent is given. */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('consent', 'default', {
                ad_storage: 'denied',
                analytics_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                wait_for_update: 500
              });
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });
            `,
          }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Pages that render their own chrome (TopicNav on marketing routes, BrandHeader
// on the landing book flow) should not stack the generic <Header> on top —
// that would produce two navigation bars.
function pageHasOwnHeader(pathname: string): boolean {
  if (pathname === '/' || pathname === '/katalog' || pathname === '/cennik') return true;
  if (pathname === '/opinie') return true;
  if (pathname.startsWith('/problem/')) return true;
  if (pathname.startsWith('/landing/book/')) return true;
  return false;
}

export default function Root() {
  useEffect(() => captureTokenFromUrl(), []);
  const { pathname } = useLocation();
  const showGlobalHeader = !pageHasOwnHeader(pathname);

  // SPA navigations don't trigger gtag auto page_view — fire it manually
  // whenever the path changes. Consent gating happens inside gtag (default
  // deny until CookieBanner accepts), so this is safe before opt-in.
  useEffect(() => {
    trackGaPageview(pathname);
  }, [pathname]);

  return (
    <div className="h-screen flex flex-col bg-white">
      <ScrollToTop />
      {showGlobalHeader && <Header />}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <main className="flex-1 overflow-auto bg-neutral-50">
          <Outlet />
        </main>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0f0f0f',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
          },
        }}
      />
      <ClientOnly>
        <Suspense fallback={null}>
          <LazyClientUtilities />
        </Suspense>
      </ClientOnly>
    </div>
  );
}

export function HydrateFallback() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-8 h-8 spinner" />
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  let title = 'Something went wrong';
  let message = 'An unexpected error occurred. Please try refreshing the page.';

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? 'Page not found' : `Error ${error.status}`;
    message =
      error.status === 404
        ? 'The page you were looking for does not exist.'
        : error.statusText || message;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-neutral-900 mb-2">{title}</h1>
        <p className="text-neutral-500 mb-6">{message}</p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
