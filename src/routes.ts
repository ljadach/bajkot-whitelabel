import { type RouteConfig, route, layout, index } from '@react-router/dev/routes';

export default [
  // Root "/" → language redirect
  index('routes/language-redirect.tsx'),

  // Polish-only public routes
  route('pl', 'routes/lang-layout.tsx', { id: 'lang-pl' }, [
    index('routes/home.tsx', { id: 'pl-home' }),
    route('about/contact', 'routes/contact.tsx', { id: 'pl-contact' }),
    route('support/faq', 'routes/faq.tsx', { id: 'pl-faq' }),
    route('*', 'routes/lang-catchall.tsx', { id: 'pl-catchall' }),
  ]),

  // Auth-gated app routes
  layout('routes/auth-layout.tsx', [
    route('book/order', 'routes/app/book-order.tsx'),
    route('book/:orderId/progress', 'routes/app/book-progress.tsx'),
    route('book/:orderId/vote', 'routes/app/book-vote.tsx'),
    route('book/:orderId/result', 'routes/app/book-result.tsx'),
    route('admin/*', 'routes/app/admin.tsx'),
  ]),

  // Global catch-all
  route('*', 'routes/catch-all.tsx', { id: 'global-catchall' }),
] satisfies RouteConfig;
