import { type RouteConfig, route, layout, index } from '@react-router/dev/routes';

export default [
  // Public marketing routes (Polish, root level)
  index('routes/home.tsx', { id: 'home' }),
  route('katalog', 'routes/catalog.tsx', { id: 'catalog' }),
  route('cennik', 'routes/cennik.tsx', { id: 'cennik' }),
  route('about/contact', 'routes/contact.tsx', { id: 'contact' }),
  route('opinie', 'routes/feedback.tsx', { id: 'feedback' }),
  route('support/faq', 'routes/faq.tsx', { id: 'faq' }),
  route('problem/:slug', 'routes/topic.tsx', { id: 'topic' }),
  route('problem/:slug/zamow', 'routes/topic-order.tsx', { id: 'topic-order' }),
  route('jak-zlozyc-ksiazke', 'routes/jak-zlozyc-ksiazke.tsx', { id: 'fold-guide' }),
  route('regulamin', 'routes/regulamin.tsx', { id: 'regulamin' }),
  route('polityka-prywatnosci', 'routes/polityka-prywatnosci.tsx', { id: 'polityka-prywatnosci' }),

  // Printed QR codes from the kindergarten mailing: /p/<ID> → home page with
  // the campaign UTMs attached. Path-based so the edge middleware can count a
  // scan without cookie consent. See `routes/qr-przedszkole.ts`.
  route('p/:id', 'routes/qr-przedszkole.ts', { id: 'qr-przedszkole' }),

  // Server-side beacon for SPA navigation tracking (forwards to Convex /track).
  route('api/track', 'routes/api.track.ts', { id: 'api-track' }),

  // Landing book flow (no auth, token-gated via Convex)
  route('landing/book/:orderId/progress', 'routes/landing-book-progress.tsx'),
  route('landing/book/:orderId/vote', 'routes/landing-book-vote.tsx'),
  route('landing/book/:orderId/result', 'routes/landing-book-result.tsx'),

  // Legacy /pl/* → redirect to root (backwards compat for indexed URLs)
  route('pl/*', 'routes/pl-redirect.tsx', { id: 'pl-redirect' }),

  // Auth-gated app routes
  layout('routes/auth-layout.tsx', [
    route('dashboard', 'routes/app/dashboard.tsx'),
    route('book/order', 'routes/app/book-order.tsx'),
    route('book/:orderId/progress', 'routes/app/book-progress.tsx'),
    route('book/:orderId/vote', 'routes/app/book-vote.tsx'),
    route('book/:orderId/result', 'routes/app/book-result.tsx'),
    route('book/:orderId/print', 'routes/app/book-print.tsx'),
  ]),

  // Admin routes — own gate (`AdminAuthGate`) so unauthenticated visitors
  // see a proper sign-in screen instead of a silent redirect to `/`.
  route('admin/*', 'routes/app/admin.tsx'),

  // Global catch-all
  route('*', 'routes/catch-all.tsx', { id: 'global-catchall' }),
] satisfies RouteConfig;
