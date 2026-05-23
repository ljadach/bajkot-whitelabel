import { httpRouter } from 'convex/server';
import { receiveWebhook } from './stripeHttp';
import { receiveTrack } from './analyticsHttp';

const http = httpRouter();

http.route({
  path: '/stripe/webhook',
  method: 'POST',
  handler: receiveWebhook,
});

http.route({
  path: '/track',
  method: 'POST',
  handler: receiveTrack,
});

export default http;
