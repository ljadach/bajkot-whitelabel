/**
 * Lightweight feedback form ingestion.
 *
 * Renders behind a single nav link + footer link. Captures email + optional
 * phone + message, stores a row for the record, and fires an email to
 * bajkoterapia.org@gmail.com so we don't have to babysit the dashboard.
 *
 * Spam controls:
 *  - per-email rate limit (2 / hour, mirrors contact form)
 *  - length caps on every field
 *  - sanitise the body for HTML in the outgoing email so accidental angle
 *    brackets don't break the layout
 */

import { action, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS_PER_EMAIL = 2;

const EMAIL_MAX = 200;
const PHONE_MAX = 30;
const MESSAGE_MAX = 2000;

const FEEDBACK_RECIPIENT = 'bajkoterapia.org@gmail.com';

export const checkFeedbackRateLimit = internalQuery({
  args: { email: v.string() },
  returns: v.object({ allowed: v.boolean(), recentCount: v.number() }),
  handler: async (ctx, args) => {
    const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;
    const normalizedEmail = args.email.toLowerCase().trim();
    const recent = await ctx.db
      .query('feedbackSubmissions')
      .withIndex('by_email_and_created', (q) =>
        q.eq('email', normalizedEmail).gte('createdAt', windowStart),
      )
      .collect();
    return {
      allowed: recent.length < MAX_SUBMISSIONS_PER_EMAIL,
      recentCount: recent.length,
    };
  },
});

export const storeFeedbackSubmission = internalMutation({
  args: {
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.string(),
    language: v.string(),
  },
  returns: v.id('feedbackSubmissions'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('feedbackSubmissions', {
      email: args.email.toLowerCase().trim(),
      phone: args.phone?.trim() || undefined,
      message: args.message.trim(),
      language: args.language,
      createdAt: Date.now(),
    });
  },
});

/** HTML-escape user-controlled text before inlining into the email body. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const submitFeedback = action({
  args: {
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.string(),
    language: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const email = args.email.trim();
    const phone = args.phone?.trim() ?? '';
    const message = args.message.trim();

    if (!email || !email.includes('@') || email.length > EMAIL_MAX) {
      return { success: false, error: 'Podaj prawidłowy adres email.' };
    }
    if (phone.length > PHONE_MAX) {
      return { success: false, error: 'Numer telefonu jest za długi.' };
    }
    if (!message || message.length > MESSAGE_MAX) {
      return { success: false, error: `Wiadomość musi mieć 1-${MESSAGE_MAX} znaków.` };
    }

    const rateLimit = await ctx.runQuery(internal.feedback.checkFeedbackRateLimit, { email });
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: 'Wysłałeś już niedawno wiadomość. Spróbuj ponownie za godzinę.',
      };
    }

    try {
      await ctx.runMutation(internal.feedback.storeFeedbackSubmission, {
        email,
        phone: phone || undefined,
        message,
        language: args.language ?? 'pl',
      });
    } catch (e) {
      console.error('[feedback] store failed', e);
      return { success: false, error: 'Nie udało się zapisać wiadomości.' };
    }

    // Fire the notification email. Failure here is logged but does NOT roll
    // back the DB row — we'd rather have the submission stored and pick up
    // the email out-of-band than lose the message.
    try {
      const { sendEmail } = await import('./lib/email');
      const subject = `[Bajkoterapia] Nowa wiadomość od ${email}`;
      const phoneLine = phone ? `<p><strong>Telefon:</strong> ${escapeHtml(phone)}</p>` : '';
      const html = `
        <p><strong>Od:</strong> ${escapeHtml(email)}</p>
        ${phoneLine}
        <p><strong>Wiadomość:</strong></p>
        <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
      `;
      const text = [`Od: ${email}`, phone ? `Telefon: ${phone}` : null, '', 'Wiadomość:', message]
        .filter((line) => line !== null)
        .join('\n');
      await sendEmail({ to: FEEDBACK_RECIPIENT, subject, html, text });
    } catch (e) {
      console.error('[feedback] email send failed (DB row still saved)', e);
    }

    return { success: true };
  },
});
