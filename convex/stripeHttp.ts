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
    if (
      message.includes('STRIPE_WEBHOOK_SECRET') ||
      message.includes('No signatures found') ||
      message.includes('signature')
    ) {
      console.error('[stripe-webhook] Signature verification failed:', message);
      return new Response('Webhook signature verification failed', { status: 400 });
    }
    console.error('[stripe-webhook] Processing error:', message);
    return new Response('Internal processing error', { status: 500 });
  }
});
