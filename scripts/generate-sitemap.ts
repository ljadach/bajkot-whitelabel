#!/usr/bin/env tsx
/**
 * Generate `public/sitemap.xml` from the canonical list of public routes.
 *
 * Runs as a `prebuild` step so the deployed sitemap always matches what's
 * actually in `src/routes.ts` + `src/data/topics.ts`. Manually editing
 * the XML is the road to drift — adding a new topic should bump the
 * sitemap automatically next deploy.
 *
 * Excluded from sitemap (intentionally):
 *   - /book/*            auth-gated per-order pages
 *   - /landing/book/*    token-gated per-order pages
 *   - /admin/*           admin panel
 *   - /dashboard         auth-gated
 *   - /pl/*              legacy redirects, not real content
 *
 * Run manually: `npx tsx scripts/generate-sitemap.ts`
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { TOPIC_SLUGS } from '../src/data/topics.js';

const SITE_URL = 'https://bajkoterapia.org';

type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

interface SitemapEntry {
  path: string;
  priority: number;
  changefreq: ChangeFreq;
}

const today = new Date().toISOString().slice(0, 10);

const STATIC_PAGES: SitemapEntry[] = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/katalog', priority: 0.9, changefreq: 'weekly' },
  { path: '/cennik', priority: 0.8, changefreq: 'monthly' },
  { path: '/jak-zlozyc-ksiazke', priority: 0.7, changefreq: 'monthly' },
  { path: '/support/faq', priority: 0.7, changefreq: 'monthly' },
  { path: '/opinie', priority: 0.5, changefreq: 'monthly' },
  { path: '/about/contact', priority: 0.5, changefreq: 'monthly' },
  { path: '/regulamin', priority: 0.3, changefreq: 'yearly' },
  { path: '/polityka-prywatnosci', priority: 0.3, changefreq: 'yearly' },
];

const TOPIC_PAGES: SitemapEntry[] = TOPIC_SLUGS.map((slug) => ({
  path: `/problem/${slug}`,
  priority: 0.8,
  changefreq: 'weekly' as const,
}));

const ALL_ENTRIES: SitemapEntry[] = [...STATIC_PAGES, ...TOPIC_PAGES];

function renderEntry(entry: SitemapEntry): string {
  return `  <url>
    <loc>${SITE_URL}${entry.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`;
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ALL_ENTRIES.map(renderEntry).join('\n')}
</urlset>
`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outPath = resolve(__dirname, '..', 'public', 'sitemap.xml');
writeFileSync(outPath, xml, 'utf8');

console.log(`Wrote ${ALL_ENTRIES.length} URLs to ${outPath}`);
