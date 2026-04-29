import { httpAction } from './_generated/server';
import { internal } from './_generated/api';

export const receiveWebhook = httpAction(async (ctx, request) => {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing Stripe signature', { status: 400 });
  }

  try {
    await ctx.runAction(internal.stripe.verifyWebhookEvent, {
      payload,
      signature,
    });
    return new Response('ok', { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Config error → 500 so Stripe retries (and we get paged via repeated
    // failures in the dashboard) until ops fixes the env var.
    if (message.includes('[stripe-config]')) {
      console.error('[stripe-webhook] Config error:', message);
      return new Response('Webhook configuration error', { status: 500 });
    }
    // Signature errors → 400 so Stripe stops retrying (the request is
    // structurally bad and a retry won't help).
    if (message.includes('No signatures found') || message.includes('signature')) {
      console.error('[stripe-webhook] Signature verification failed:', message);
      return new Response('Webhook signature verification failed', { status: 400 });
    }
    // Business/processing errors are caught inside verifyWebhookEvent and
    // never reach here. If something does, treat as infrastructure (500).
    console.error('[stripe-webhook] Unexpected error:', message);
    return new Response('Internal processing error', { status: 500 });
  }
});
