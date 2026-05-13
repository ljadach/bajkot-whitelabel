'use node';

/**
 * Public email actions exposed to the rest of the pipeline. These are thin
 * wrappers over `lib/email.ts`: they pull whatever order data they need
 * from the DB, build the HTML, and hand off to the Resend SDK.
 */

import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import {
  buildAdminPrintAlertEmail,
  buildBookReadyEmail,
  buildOrderConfirmationEmail,
  formatOrderNumber,
  sendEmail,
  type BookFormat,
} from './lib/email';
import { PROBLEMS } from './lib/bookData';

const ADMIN_PRINT_ALERT_RECIPIENT = 'bajkoterapia.org@gmail.com';

function resolveProblemTitle(problemId: string): string {
  const problem = PROBLEMS[problemId];
  if (problem) return problem.title_pl;
  // Fallback: humanize the raw id so the customer doesn't see "fear_of_dark".
  return problemId.replace(/_/g, ' ');
}

function resolveFormat(format: string | undefined | null): BookFormat {
  return format === 'pdf_print' ? 'pdf_print' : 'pdf';
}

/**
 * Send the post-payment confirmation email — "Mamy Twoje zamówienie".
 * Triggered immediately after Stripe webhook flips paymentStatus to
 * 'completed' (see billing.ts:markBookOrderPaid). No PDF is expected at
 * this point — the pipeline is still working.
 *
 * No-ops gracefully when:
 *   - the order is missing
 *   - the parent never supplied an email
 *   - RESEND_API_KEY is not configured
 */
export const sendOrderConfirmation = internalAction({
  args: { bookOrderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { bookOrderId }) => {
    const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, {
      orderId: bookOrderId,
    });
    if (!order) {
      console.warn('[email.sendOrderConfirmation] order not found', bookOrderId);
      return null;
    }
    if (!order.email) {
      console.warn('[email.sendOrderConfirmation] no email on order', bookOrderId);
      return null;
    }

    const { subject, html, text } = buildOrderConfirmationEmail({
      childName: order.childName,
      childAge: order.ageNumber ?? order.ageBracket ?? null,
      problemTitle: resolveProblemTitle(order.problemId),
      format: resolveFormat(order.format),
      orderNumber: formatOrderNumber(bookOrderId),
    });

    await sendEmail({ to: order.email, subject, html, text });
    return null;
  },
});

/**
 * Send the "Twoja bajka jest gotowa" email with a download link. Triggered
 * from markOrderComplete once the pipeline produces a final PDF.
 *
 * No-ops gracefully when:
 *   - the order is missing
 *   - the parent never supplied an email
 *   - the PDF isn't actually composed yet (defensive — shouldn't happen
 *     when called from markOrderComplete, but kept for safety)
 *   - RESEND_API_KEY is not configured
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
    if (!order.pdfStorageId && !order.r2FullKey) {
      console.warn('[email.sendBookReady] PDF not ready, skipping send', bookOrderId);
      return null;
    }
    // Recipient gets a one-shot link. Convex storage URLs are signed and
    // short-lived; R2 needs explicit presigning. Use a longer TTL (24h)
    // so users following the email later still hit a live link.
    let downloadUrl: string | null;
    if (order.r2FullKey) {
      const { presignR2GetUrl, bookPdfFilename } = await import('./lib/r2Presign');
      downloadUrl = await presignR2GetUrl(
        order.r2FullKey,
        24 * 60 * 60,
        bookPdfFilename(order, 'full'),
      );
    } else {
      downloadUrl = await ctx.storage.getUrl(order.pdfStorageId!);
    }
    if (!downloadUrl) {
      console.warn('[email.sendBookReady] no download URL resolved', bookOrderId);
      return null;
    }

    // Landing orders live under /landing/book/<id>/result, auth orders under
    // /book/<id>/result. We don't store flow metadata explicitly — derive
    // from the synthetic landing user id (matches assertLandingOrder).
    //
    // Cross-device handoff: append `?t=<rawToken>` for landing orders so the
    // parent can open the email on a device that never saw the intake (mom
    // orders on laptop, opens email on phone — localStorage doesn't carry
    // between browsers). Frontend captures the token from the URL, saves it
    // to localStorage, and strips it from the address bar.
    const isLanding = order.clerkUserId === 'landing-user';
    const appUrl = process.env.APP_URL || 'https://bajkoterapia.org';
    const resultPath = isLanding
      ? `/landing/book/${bookOrderId}/result`
      : `/book/${bookOrderId}/result`;
    const tokenQuery =
      isLanding && order.accessTokenRaw ? `?t=${encodeURIComponent(order.accessTokenRaw)}` : '';
    const resultUrl = `${appUrl}${resultPath}${tokenQuery}`;

    const bookTitle = extractBookTitle(order.storyDraft);
    const { subject, html, text } = buildBookReadyEmail({
      childName: order.childName,
      bookTitle,
      downloadUrl,
      resultUrl,
      format: resolveFormat(order.format),
      orderCreatedAtMs: order.createdAt,
    });

    await sendEmail({ to: order.email, subject, html, text });
    return null;
  },
});

/**
 * Internal admin alert: customer paid for the PDF+Print variant, fulfillment
 * team needs to print + ship a physical book in 3-5 working days. Triggered
 * exclusively from billing.markBookOrderPaid when format === 'pdf_print'.
 *
 * No-ops gracefully when:
 *   - the order is missing
 *   - format is not 'pdf_print' (defensive — should be filtered upstream)
 *   - RESEND_API_KEY is not configured
 */
export const sendAdminPrintAlert = internalAction({
  args: { bookOrderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { bookOrderId }) => {
    const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, {
      orderId: bookOrderId,
    });
    if (!order) {
      console.warn('[email.sendAdminPrintAlert] order not found', bookOrderId);
      return null;
    }
    if (order.format !== 'pdf_print') {
      console.warn(
        `[email.sendAdminPrintAlert] order format is ${order.format ?? 'pdf'}, skipping`,
        bookOrderId,
      );
      return null;
    }

    const appUrl = process.env.APP_URL || 'https://bajkoterapia.org';
    const { subject, html, text } = buildAdminPrintAlertEmail({
      orderId: bookOrderId,
      orderNumber: formatOrderNumber(bookOrderId),
      childName: order.childName,
      problemTitle: resolveProblemTitle(order.problemId),
      customerEmail: order.email ?? null,
      shippingAddress: order.shippingAddress ?? null,
      adminUrl: `${appUrl}/admin/batch?tab=orders&orderId=${bookOrderId}`,
    });

    await sendEmail({ to: ADMIN_PRINT_ALERT_RECIPIENT, subject, html, text });
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
