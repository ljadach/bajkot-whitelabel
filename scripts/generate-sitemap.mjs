/**
 * Prebuild script — generates public/sitemap.xml from existing config files.
 * Run: node scripts/generate-sitemap.mjs
 * Hooked automatically via package.json "prebuild" script.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const HOSTNAME = 'https://aitutoro.com';
const LANGS = ['en', 'pl', 'de'];

// --- Extract slugs from TypeScript config files via regex ---

function extractSlugs(filePath, registryName) {
  const src = readFileSync(resolve(root, filePath), 'utf-8');
  const re = new RegExp(`slug:\\s*'([^']+)'`, 'g');
  const slugs = [];
  let m;
  while ((m = re.exec(src))) slugs.push(m[1]);
  return slugs;
}

const segmentSlugs = extractSlugs('src/pages/segmentConfig.ts');
const productSlugs = extractSlugs('src/pages/productConfig.ts');
const comparisonSlugs = extractSlugs('src/pages/comparisonConfig.ts');

// --- Build route list with priorities ---

const routes = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  ...segmentSlugs.map((s) => ({ path: `/${s}`, priority: '0.8', changefreq: 'weekly' })),
  { path: '/pricing', priority: '0.7', changefreq: 'monthly' },
  { path: '/ai-tools', priority: '0.7', changefreq: 'weekly' },
  ...productSlugs.map((s) => ({ path: `/ai-tools/${s}`, priority: '0.7', changefreq: 'weekly' })),
  { path: '/ai-tools/compare', priority: '0.6', changefreq: 'weekly' },
  ...comparisonSlugs.map((s) => ({ path: `/ai-tools/compare/${s}`, priority: '0.6', changefreq: 'weekly' })),
  { path: '/ai-tools/glossary', priority: '0.5', changefreq: 'monthly' },
  { path: '/support/faq', priority: '0.5', changefreq: 'monthly' },
  { path: '/about/contact', priority: '0.5', changefreq: 'monthly' },
];

// --- Deduplicate routes ---

const seen = new Set();
const uniqueRoutes = routes.filter((r) => {
  if (seen.has(r.path)) return false;
  seen.add(r.path);
  return true;
});

// --- Generate XML ---

const today = new Date().toISOString().split('T')[0];

function urlEntry(lang, route) {
  const loc = `${HOSTNAME}/${lang}${route.path === '/' ? '/' : route.path}`;
  const alternates = LANGS.map(
    (l) =>
      `    <xhtml:link rel="alternate" hreflang="${l}" href="${HOSTNAME}/${l}${route.path === '/' ? '/' : route.path}" />`
  ).join('\n');
  const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${HOSTNAME}/en${route.path === '/' ? '/' : route.path}" />`;

  return `  <url>
    <loc>${loc}</loc>
${alternates}
${xDefault}
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
}

const entries = uniqueRoutes.flatMap((route) => LANGS.map((lang) => urlEntry(lang, route)));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;

writeFileSync(resolve(root, 'public/sitemap.xml'), xml, 'utf-8');

const urlCount = uniqueRoutes.length * LANGS.length;
console.log(`sitemap.xml generated: ${uniqueRoutes.length} routes × ${LANGS.length} langs = ${urlCount} URLs`);
