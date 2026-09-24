'use node';

/**
 * Transactional e-mail actions. Thin wrappers over `lib/email.ts`: they load
 * the order, resolve its partner theme, build the HTML and hand off to
 * Resend. Links point at the partner's own URLs (lib/partners.ts) and carry
 * the per-order token (`?t=`) so they work on a device that never saw the
 * order form.
 */

import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import {
  DOWNLOAD_LINK_TTL_HOURS,
  buildAdminPrintAlertEmail,
  buildBookReadyEmail,
  buildOrderConfirmationEmail,
  emailBrand,
  formatOrderNumber,
  sendEmail,
  type BookFormat,
} from './lib/email';
import { bookResultPath, resolvePartner } from './lib/partners';
import { PROBLEMS } from './lib/bookData';

function appUrl(): string {
  const url = process.env.APP_URL;
  if (!url) throw new Error('APP_URL is not configured');
  return url.replace(/\/+$/, '');
}

function resolveTopicTitle(problemId: string): string {
  const problem = PROBLEMS[problemId];
  if (problem) return problem.title_pl;
  // Fallback: humanize the raw id so the customer doesn't see "fear_of_dark".
  return problemId.replace(/_/g, ' ');
}

function resolveFormat(format: string | undefined | null): BookFormat {
  return format === 'pdf_print' ? 'pdf_print' : 'pdf';
}

/** Order page URL with the capability token, for the partner the order came through. */
function orderResultUrl(order: {
  _id: string;
  partnerId?: string;
  accessTokenRaw?: string;
}): string {
  const token = order.accessTokenRaw ? `?t=${encodeURIComponent(order.accessTokenRaw)}` : '';
  return `${appUrl()}${bookResultPath(order.partnerId, order._id)}${token}`;
}

/**
 * Payment confirmation — sent right after the Stripe webhook flips
 * paymentStatus to 'completed' (billing.markBookOrderPaid).
 *
 * No-ops gracefully when the order is missing, has no e-mail, or e-mail
 * isn't configured (see lib/email.ts).
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

    const partner = resolvePartner(order.partnerId);
    const brand = emailBrand(partner, appUrl());
    const { subject, html, text } = buildOrderConfirmationEmail({
      brand,
      childName: order.childName,
      childAge: order.ageNumber ?? order.ageBracket ?? null,
      topicTitle: resolveTopicTitle(order.problemId),
      format: resolveFormat(order.format),
      orderNumber: formatOrderNumber(bookOrderId),
      paidAmountMinor: order.paidAmountMinor ?? null,
      paidCurrency: order.paidCurrency ?? null,
      testPayment: order.paymentMode === 'test',
      resultUrl: orderResultUrl(order),
    });

    await sendEmail({
      to: order.email,
      subject,
      html,
      text,
      fromName: partner.name,
      replyTo: partner.supportEmail,
    });
    return null;
  },
});

/**
 * "Twoja bajka jest gotowa" with a download link. Sent once the order is
 * both paid and composed — from markBookOrderPaid or markOrderComplete,
 * whichever happens second.
 *
 * No-ops gracefully when the order is missing or unpaid, has no e-mail, the
 * PDF isn't composed yet, or e-mail isn't configured.
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
    if (order.paymentStatus !== 'completed') {
      // Paywall guard: this email hands out the full PDF link, so it must
      // never be sent for an unpaid order regardless of who scheduled it.
      console.warn('[email.sendBookReady] order not paid — skipping send', bookOrderId);
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
    // R2 needs explicit presigning; Convex storage URLs work as they are.
    let downloadUrl: string | null;
    if (order.r2FullKey) {
      const { presignBookPdf } = await import('./lib/r2Presign');
      downloadUrl = await presignBookPdf(order, 'full', DOWNLOAD_LINK_TTL_HOURS * 60 * 60);
    } else {
      downloadUrl = await ctx.storage.getUrl(order.pdfStorageId!);
    }
    if (!downloadUrl) {
      console.warn('[email.sendBookReady] no download URL resolved', bookOrderId);
      return null;
    }

    const partner = resolvePartner(order.partnerId);
    const { subject, html, text } = buildBookReadyEmail({
      brand: emailBrand(partner, appUrl()),
      childName: order.childName,
      bookTitle: extractBookTitle(order.storyDraft),
      downloadUrl,
      resultUrl: orderResultUrl(order),
      format: resolveFormat(order.format),
    });

    await sendEmail({
      to: order.email,
      subject,
      html,
      text,
      fromName: partner.name,
      replyTo: partner.supportEmail,
    });
    return null;
  },
});

/**
 * Internal alert: a customer paid for PDF + print, so someone has to print
 * and ship the book. Goes to ADMIN_ALERT_EMAIL; skipped when that's unset.
 * Test-mode payments are flagged in the subject so nobody prints a demo.
 */
export const sendAdminPrintAlert = internalAction({
  args: { bookOrderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { bookOrderId }) => {
    const recipient = process.env.ADMIN_ALERT_EMAIL;
    if (!recipient) {
      console.warn('[email.sendAdminPrintAlert] ADMIN_ALERT_EMAIL not set — skipping', bookOrderId);
      return null;
    }
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

    const { subject, html, text } = buildAdminPrintAlertEmail({
      orderId: bookOrderId,
      orderNumber: formatOrderNumber(bookOrderId),
      partnerName: resolvePartner(order.partnerId).name,
      testPayment: order.paymentMode === 'test',
      childName: order.childName,
      topicTitle: resolveTopicTitle(order.problemId),
      customerEmail: order.email ?? null,
      shippingAddress: order.shippingAddress ?? null,
    });

    await sendEmail({ to: recipient, subject, html, text });
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
