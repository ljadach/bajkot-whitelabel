import { httpRouter } from 'convex/server';
import { receiveWebhook } from './stripeHttp';

const http = httpRouter();

http.route({
  path: '/stripe/webhook',
  method: 'POST',
  handler: receiveWebhook,
});

export default http;
