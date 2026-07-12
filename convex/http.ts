import { httpRouter } from 'convex/server';
import { receiveWebhook } from './stripeHttp';
import { receiveTrack } from './analyticsHttp';
import { receivePrintCallback } from './printPdfHttp';

const http = httpRouter();

http.route({
  path: '/print-ready/callback',
  method: 'POST',
  handler: receivePrintCallback,
});

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
