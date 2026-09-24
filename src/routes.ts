import { type RouteConfig, route, index } from '@react-router/dev/routes';

export default [
  // Every page sits under an optional partner prefix: /zamow/<slug> renders
  // the default theme, /przyklad/zamow/<slug> the "przyklad" partner's
  // (convex/lib/partners.ts). The layout 404s unknown partners.
  route(':partner?', 'routes/partner.tsx', { id: 'partner' }, [
    // 1. Topic picker
    index('routes/start.tsx', { id: 'start' }),
    // 2–3. Order form (situation, then appearance + checkout via ?krok=2)
    route('zamow/:slug', 'routes/order.tsx', { id: 'order' }),
    // Live progress with the inline style vote and dedication
    route('bajka/:orderId', 'routes/book-progress.tsx', { id: 'book-progress' }),
    // Preview + payment, then the download
    route('bajka/:orderId/gotowa', 'routes/book-result.tsx', { id: 'book-result' }),
  ]),

  route('*', 'routes/not-found.tsx', { id: 'not-found' }),
] satisfies RouteConfig;
