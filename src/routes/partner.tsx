import {
  Outlet,
  redirect,
  type LoaderFunctionArgs,
  type ShouldRevalidateFunctionArgs,
} from 'react-router';
import { DEFAULT_PARTNER_ID, getPartner } from '../../convex/lib/partners';

/**
 * Validates the optional partner prefix. The theme itself is applied by the
 * root layout from the URL; this only decides whether the URL is valid.
 *
 *  - /<unknown>/...        → 404
 *  - /demo/...             → /...   (the default theme has no prefix)
 *  - /...?partner=<id>     → /<id>/...  (query form of the same link; unknown id → 404)
 */
export function loader({ params, request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const prefix = params.partner;

  if (prefix !== undefined) {
    if (!getPartner(prefix)) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw new Response('Not Found', { status: 404 });
    }
    if (prefix === DEFAULT_PARTNER_ID) {
      const rest = url.pathname.slice(`/${prefix}`.length) || '/';
      return redirect(`${rest}${url.search}`);
    }
    return null;
  }

  const alias = url.searchParams.get('partner');
  if (alias !== null) {
    if (!getPartner(alias)) {
      // Same as an unknown prefix — a typo in a pitch link should be obvious.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw new Response('Not Found', { status: 404 });
    }
    url.searchParams.delete('partner');
    if (alias === DEFAULT_PARTNER_ID) {
      return redirect(`${url.pathname}${url.search}`);
    }
    const rest = url.pathname === '/' ? '' : url.pathname;
    return redirect(`/${alias}${rest}${url.search}`);
  }
  return null;
}

// Pure URL check — only worth re-running when the prefix or the alias changes,
// not on every ?krok= step inside the form.
export function shouldRevalidate({
  currentParams,
  nextParams,
  nextUrl,
}: ShouldRevalidateFunctionArgs) {
  return currentParams.partner !== nextParams.partner || nextUrl.searchParams.has('partner');
}

export default function PartnerLayout() {
  return <Outlet />;
}
