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

export default function middleware(request: Request): Response | undefined {
  const url = new URL(request.url);
  if (url.pathname !== '/') return undefined;

  const cookieLang = request.headers.get('cookie')?.match(/(?:^|;\s*)lang=([^;]+)/)?.[1];
  const lang = cookieLang && (SUPPORTED as readonly string[]).includes(cookieLang) ? cookieLang : parseLang(request.headers.get('accept-language'));

  return Response.redirect(new URL(`/${lang}/`, url), 302);
}

export const config = { matcher: ['/'] };
