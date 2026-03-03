import { type RouteConfig, type RouteConfigEntry, route, layout, index } from '@react-router/dev/routes';
import { SEGMENT_CONFIG } from './pages/segmentConfig';

const LANGS = ['en', 'pl', 'de'] as const;

function segmentRoutes(lang: string): RouteConfigEntry[] {
  return Object.values(SEGMENT_CONFIG).map((cfg) => route(cfg.slug, 'routes/segment.tsx', { id: `${lang}-segment-${cfg.segment}` }));
}

function productRoute(lang: string): RouteConfigEntry[] {
  return [route('ai-tools/:slug', 'routes/product.tsx', { id: `${lang}-product` })];
}

function comparisonRoute(lang: string): RouteConfigEntry[] {
  return [route('ai-tools/compare/:slug', 'routes/comparison.tsx', { id: `${lang}-comparison` })];
}

function legacyRedirects(): RouteConfigEntry[] {
  const redirects: RouteConfigEntry[] = [];

  // Old segment slugs without lang prefix (e.g. /business)
  for (const cfg of Object.values(SEGMENT_CONFIG)) {
    redirects.push(
      route(cfg.segment, 'routes/legacy-redirect.tsx', {
        id: `legacy-segment-${cfg.segment}`,
      })
    );
  }

  // Old static routes without lang prefix
  const staticPaths = ['pricing', 'ai-tools/compare', 'ai-tools/compare/:slug', 'ai-tools/glossary', 'ai-tools/:slug', 'ai-tools', 'about/contact', 'support/faq'];
  for (const path of staticPaths) {
    redirects.push(
      route(path, 'routes/legacy-redirect.tsx', {
        id: `legacy-${path.replace(/[/:]/g, '-')}`,
      })
    );
  }

  return redirects;
}

export default [
  // Root "/" → language redirect
  index('routes/language-redirect.tsx'),

  // Language-prefixed public routes (pre-rendered)
  // Use route() (not layout()) because we need the lang path prefix
  ...LANGS.flatMap((lang) => [
    route(lang, 'routes/lang-layout.tsx', { id: `lang-${lang}` }, [
      index('routes/home.tsx', { id: `${lang}-home` }),
      ...segmentRoutes(lang),
      route('pricing', 'routes/pricing.tsx', { id: `${lang}-pricing` }),
      route('ai-tools/glossary', 'routes/glossary.tsx', { id: `${lang}-glossary` }),
      route('ai-tools/compare', 'routes/comparison-hub.tsx', {
        id: `${lang}-comparison-hub`,
      }),
      ...comparisonRoute(lang),
      ...productRoute(lang),
      route('ai-tools', 'routes/tools-hub.tsx', { id: `${lang}-tools-hub` }),
      route('about/contact', 'routes/contact.tsx', { id: `${lang}-contact` }),
      route('support/faq', 'routes/faq.tsx', { id: `${lang}-faq` }),
      route('*', 'routes/lang-catchall.tsx', { id: `${lang}-catchall` }),
    ]),
  ]),

  // Auth-gated app routes (client-only, no SSR content)
  layout('routes/auth-layout.tsx', [
    route('chat', 'routes/app/chat.tsx'),
    route('verification', 'routes/app/verification.tsx'),
    route('summary', 'routes/app/summary.tsx'),
    route('plan/*', 'routes/app/plan.tsx'),
    route('complete', 'routes/app/complete.tsx'),
    route('dashboard', 'routes/app/dashboard.tsx'),
    route('settings', 'routes/app/settings.tsx'),
    route('admin/*', 'routes/app/admin.tsx'),
    route('team', 'routes/app/team.tsx'),
    route('team/invite/:token', 'routes/app/join-team.tsx'),
    route('assessment', 'routes/app/legacy-assessment.tsx'),
    route('course-preview', 'routes/app/legacy-course-preview.tsx'),
  ]),

  // Legacy redirects (bare paths without lang prefix)
  ...legacyRedirects(),

  // Global catch-all
  route('*', 'routes/catch-all.tsx', { id: 'global-catchall' }),
] satisfies RouteConfig;
