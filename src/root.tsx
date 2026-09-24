import type { ReactNode } from 'react';
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
import './index.css';
import './lib/i18n';

import { ScrollToTop } from './components/ScrollToTop';
import { BrandHeader } from './components/BrandChrome';
import { PartnerContext } from './hooks/usePartner';
import { faviconDataUri, pageTitle, partnerFromPathname, themeCss } from './lib/theme';
import { startPath } from '../convex/lib/partners';

export function Layout({ children }: { children: ReactNode }) {
  // The partner theme follows the URL (/<partner>/...), so it is known on the
  // server and the first paint is already in the partner's colours.
  const { pathname } = useLocation();
  const partner = partnerFromPathname(pathname);

  return (
    <html lang="pl">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Demo for B2B partners — keep it out of search engines. */}
        <meta name="robots" content="noindex, nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <link rel="icon" type="image/svg+xml" href={faviconDataUri(partner)} />
        <meta name="theme-color" content={partner.colors.primary} />
        <style dangerouslySetInnerHTML={{ __html: themeCss(partner) }} />
        <Meta />
        <Links />
      </head>
      <body>
        <PartnerContext.Provider value={partner}>{children}</PartnerContext.Provider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return (
    <div className="h-screen flex flex-col">
      <ScrollToTop />
      <main className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </main>
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
  const { pathname } = useLocation();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const heading = notFound ? 'Nie ma takiej strony' : 'Coś poszło nie tak';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <title>{pageTitle(pathname, heading)}</title>
      <BrandHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">{notFound ? '🧭' : '😕'}</div>
          <h1 className="text-2xl font-black text-primary-900 mb-2">{heading}</h1>
          <p className="text-gray-500 mb-8">
            {notFound
              ? 'Sprawdź link albo zacznij od wyboru tematu bajki.'
              : 'Odśwież stronę i spróbuj ponownie.'}
          </p>
          <a
            href={startPath(partnerFromPathname(pathname).id)}
            className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-on-accent font-bold px-6 py-3 rounded-2xl transition"
          >
            Wybierz temat bajki <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
