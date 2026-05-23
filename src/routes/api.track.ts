import type { ActionFunctionArgs } from 'react-router';

// Server-side beacon target. React Router resource route (no component
// exported) — the client posts here on every SPA navigation, we enrich the
// payload with Vercel's IP/country headers and forward to Convex `/track`
// using the shared secret that only the server knows.
//
// The edge middleware already handles full page loads (including the initial
// hit); this route covers everything React Router swaps without a real HTTP
// roundtrip. Skipping is done client-side so we don't waste this Vercel
// function on /admin or /book paths.

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const convexSite = process.env.CONVEX_SITE_URL;
  const secret = process.env.ANALYTICS_SECRET;
  if (!convexSite || !secret) {
    // Misconfig — fail silent so the beacon doesn't error in user devtools.
    return new Response(null, { status: 204 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return new Response('bad payload', { status: 400 });
  }
  const p = body as Record<string, unknown>;
  const path = typeof p.path === 'string' ? p.path : '';
  if (!path) return new Response('missing path', { status: 400 });

  const ipHeader = request.headers.get('x-forwarded-for') ?? '';
  const ip = ipHeader.split(',')[0].trim() || request.headers.get('x-real-ip') || '';

  const payload = {
    timestamp: Date.now(),
    ip,
    country: request.headers.get('x-vercel-ip-country') ?? undefined,
    userAgent:
      (typeof p.userAgent === 'string' ? p.userAgent : null) ??
      request.headers.get('user-agent') ??
      '',
    path,
    referer:
      (typeof p.referer === 'string' ? p.referer : null) ??
      request.headers.get('referer') ??
      undefined,
    acceptLanguage: request.headers.get('accept-language') ?? undefined,
  };

  await fetch(`${convexSite}/track`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-track-secret': secret,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});

  return new Response(null, { status: 204 });
}
