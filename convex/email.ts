'use node';

/**
 * Public email actions exposed to the rest of the pipeline. These are thin
 * wrappers over `lib/email.ts`: they pull whatever order data they need
 * from the DB, build the HTML, and hand off to the Resend SDK.
 */

import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { sendEmail, buildBookReadyEmail } from './lib/email';

/**
 * Send the post-payment "Twoja bajka jest gotowa" email. Looks up the
 * order, generates a fresh download URL (Convex storage URLs are
 * signed and short-lived) and ships the templated email through Resend.
 *
 * No-ops gracefully when:
 *   - the order is missing
 *   - the parent never supplied an email (legacy admin orders)
 *   - the PDF isn't actually composed yet
 *   - RESEND_API_KEY is not configured (handled inside sendEmail)
 */
export const sendBookReady = internalAction({
  args: { bookOrderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { bookOrderId }) => {
    const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, {
      orderId: bookOrderId,
    });
    if (!order) {
      console.warn('[email.sendBookReady] order not found', bookOrderId);
      return null;
    }
    if (!order.email) {
      console.warn('[email.sendBookReady] no email on order', bookOrderId);
      return null;
    }
    if (!order.pdfStorageId) {
      console.warn('[email.sendBookReady] PDF not ready, skipping send', bookOrderId);
      return null;
    }
    const downloadUrl = await ctx.storage.getUrl(order.pdfStorageId);
    if (!downloadUrl) {
      console.warn('[email.sendBookReady] storage.getUrl returned null', bookOrderId);
      return null;
    }

    // Landing orders live under /landing/book/<id>/result, auth orders under
    // /book/<id>/result. We don't store flow metadata explicitly — derive
    // from the synthetic landing user id (matches assertLandingOrder).
    const isLanding = order.clerkUserId === 'landing-user';
    const appUrl = process.env.APP_URL || 'https://bajkoterapia.org';
    const resultUrl = isLanding
      ? `${appUrl}/landing/book/${bookOrderId}/result`
      : `${appUrl}/book/${bookOrderId}/result`;

    const bookTitle = extractBookTitle(order.storyDraft);
    const { subject, html, text } = buildBookReadyEmail({
      childName: order.childName,
      bookTitle,
      downloadUrl,
      resultUrl,
    });

    await sendEmail({ to: order.email, subject, html, text });
    return null;
  },
});

function extractBookTitle(storyDraft: string | null | undefined): string | null {
  if (!storyDraft) return null;
  try {
    const parsed = JSON.parse(storyDraft) as { title?: unknown };
    if (typeof parsed.title === 'string' && parsed.title.trim()) return parsed.title.trim();
  } catch {
    // ignore — title is best-effort
  }
  return null;
}
