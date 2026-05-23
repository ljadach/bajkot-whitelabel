import { httpAction } from './_generated/server';
import { internal } from './_generated/api';

// Server-side page-view ingestion. Called by Vercel edge middleware after each
// public-route hit. Authenticated by shared secret in `x-track-secret` —
// httpAction has no CORS guard, so without this anyone could spam the table.
export const receiveTrack = httpAction(async (ctx, request) => {
  const expected = process.env.ANALYTICS_SECRET;
  if (!expected) {
    // Misconfig: don't accept writes if no secret is set, otherwise the
    // endpoint becomes an open relay.
    console.error('[analytics] ANALYTICS_SECRET not set; rejecting /track');
    return new Response('not configured', { status: 503 });
  }
  if (request.headers.get('x-track-secret') !== expected) {
    return new Response('forbidden', { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }

  if (typeof payload !== 'object' || payload === null) {
    return new Response('bad payload', { status: 400 });
  }
  const p = payload as Record<string, unknown>;
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.length > 0 ? v : undefined;
  const path = str(p.path);
  const userAgent = str(p.userAgent) ?? '';
  const ip = str(p.ip) ?? '';
  const timestamp = typeof p.timestamp === 'number' ? p.timestamp : Date.now();
  if (!path) return new Response('missing path', { status: 400 });

  // Cap stringy fields so a misbehaving client can't bloat the row.
  const cap = (s: string | undefined, max: number) =>
    s === undefined ? undefined : s.length > max ? s.slice(0, max) : s;

  await ctx.runMutation(internal.analytics.recordPageView, {
    timestamp,
    ip: cap(ip, 64) ?? '',
    country: cap(str(p.country), 8),
    userAgent: cap(userAgent, 512) ?? '',
    path: cap(path, 512) ?? '',
    referer: cap(str(p.referer), 1024),
    acceptLanguage: cap(str(p.acceptLanguage), 128),
    clerkUserId: cap(str(p.clerkUserId), 128),
    accessTokenHash: cap(str(p.accessTokenHash), 128),
  });

  return new Response(null, { status: 204 });
});
