import { httpRouter } from 'convex/server';
import { receiveWebhook } from './stripeHttp';

const http = httpRouter();

// Register this URL (https://<deployment>.convex.site/stripe/webhook) as an
// endpoint in BOTH the test and the live Stripe dashboard — see lib/stripeMode.ts.
http.route({
  path: '/stripe/webhook',
  method: 'POST',
  handler: receiveWebhook,
});

export default http;
