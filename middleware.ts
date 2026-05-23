const SUPPORTED = ['en', 'pl', 'de'] as const;
const DEFAULT_LANG = 'en';

function parseLang(header: string | null): string {
  if (!header) return DEFAULT_LANG;
  const best = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { lang: tag.split('-')[0].toLowerCase(), q: parseFloat(q ?? '1') };
    })
    .sort((a, b) => b.q - a.q)
    .find(({ lang }) => (SUPPORTED as readonly string[]).includes(lang));
  return best?.lang ?? DEFAULT_LANG;
}

// Server-side analytics. Paths skipped here never reach `pageViews` — keep in
// sync with whatever the operator considers "noise" (assets, admin, auth flow,
// API endpoints). The first hit on the marketing routes is what matters.
const SKIP_PREFIXES = ['/_', '/api', '/admin', '/book', '/sign-in', '/sign-up', '/__nitro'];
const ASSET_EXT = /\.(?:png|jpe?g|svg|webp|gif|ico|css|js|map|woff2?|ttf|otf|txt|xml|json|pdf|mp4|webm)$/i;

function shouldSkip(path: string): boolean {
  if (ASSET_EXT.test(path)) return true;
  for (const prefix of SKIP_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function track(request: Request): Promise<void> {
  // Only GETs are page loads worth tracking. POST/PUT/etc. are app traffic
  // (form submits, beacon endpoint) and would double-count or pollute paths.
  if (request.method !== 'GET') return;

  const convexSite = process.env.CONVEX_SITE_URL;
  const secret = process.env.ANALYTICS_SECRET;
  if (!convexSite || !secret) return;

  const url = new URL(request.url);
  if (shouldSkip(url.pathname)) return;

  const ipHeader = request.headers.get('x-forwarded-for') ?? '';
  const ip = ipHeader.split(',')[0].trim() || request.headers.get('x-real-ip') || '';
  const token = url.searchParams.get('token');
  const accessTokenHash = token ? await sha256Hex(token) : undefined;

  const body = {
    timestamp: Date.now(),
    ip,
    country: request.headers.get('x-vercel-ip-country') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? '',
    path: url.pathname,
    referer: request.headers.get('referer') ?? undefined,
    acceptLanguage: request.headers.get('accept-language') ?? undefined,
    accessTokenHash,
  };

  try {
    await fetch(`${convexSite}/track`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-track-secret': secret,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Tracking must never break a user request.
  }
}

export default function middleware(
  request: Request,
  context: { waitUntil?: (p: Promise<unknown>) => void },
): Response | undefined {
  // Fire-and-forget tracking. `waitUntil` keeps the function alive past the
  // response so the POST has a chance to finish; if the runtime doesn't pass
  // it, we still kick it off and accept that some hits may be cut short.
  const trackPromise = track(request);
  if (context.waitUntil) {
    context.waitUntil(trackPromise);
  } else {
    void trackPromise.catch(() => {});
  }

  const url = new URL(request.url);
  if (url.pathname !== '/') return undefined;

  const cookieLang = request.headers.get('cookie')?.match(/(?:^|;\s*)lang=([^;]+)/)?.[1];
  const lang =
    cookieLang && (SUPPORTED as readonly string[]).includes(cookieLang)
      ? cookieLang
      : parseLang(request.headers.get('accept-language'));

  return Response.redirect(new URL(`/${lang}/`, url), 302);
}

export const config = { matcher: ['/((?!_).*)'] };
