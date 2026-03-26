/**
 * Lead Capture for B2B/EDU/Executive Segment Landing Pages
 *
 * Handles:
 * - Lead submission from contact forms
 * - Rate limiting by email (prevent spam)
 * - Email notifications via Resend REST API
 */

import { action, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

const RESEND_API_URL = 'https://api.resend.com/emails';
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS_PER_EMAIL = 2; // Max 2 submissions per email per hour
const GLOBAL_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_GLOBAL_SUBMISSIONS_PER_WINDOW = 30;
const MIN_FORM_FILL_TIME_MS = 1500;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const CAPTCHA_REQUIRED =
  process.env.LEADS_CAPTCHA_REQUIRED === 'true' || Boolean(TURNSTILE_SECRET_KEY);

// Segment type for validation
const segmentValidator = v.union(v.literal('business'), v.literal('edu'), v.literal('executive'));

/**
 * Check if an email has been submitted recently (rate limiting)
 */
export const checkEmailRateLimit = internalQuery({
  args: {
    email: v.string(),
  },
  returns: v.object({
    allowed: v.boolean(),
    recentCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;
    const normalizedEmail = args.email.toLowerCase().trim();

    // Count recent submissions from this email
    const recentLeads = await ctx.db
      .query('leads')
      .withIndex('by_created')
      .filter((q) =>
        q.and(q.gte(q.field('createdAt'), windowStart), q.eq(q.field('email'), normalizedEmail)),
      )
      .collect();

    const recentCount = recentLeads.length;
    const allowed = recentCount < MAX_SUBMISSIONS_PER_EMAIL;

    return { allowed, recentCount };
  },
});

/**
 * Check global lead submission rate limit (all emails combined)
 */
export const checkGlobalRateLimit = internalQuery({
  args: {},
  returns: v.object({
    allowed: v.boolean(),
    recentCount: v.number(),
  }),
  handler: async (ctx) => {
    const windowStart = Date.now() - GLOBAL_RATE_LIMIT_WINDOW_MS;
    const recentLeads = await ctx.db
      .query('leads')
      .withIndex('by_created')
      .order('desc')
      .take(MAX_GLOBAL_SUBMISSIONS_PER_WINDOW + 1);
    const recentCount = recentLeads.filter((lead) => lead.createdAt >= windowStart).length;
    const allowed = recentCount < MAX_GLOBAL_SUBMISSIONS_PER_WINDOW;
    return { allowed, recentCount };
  },
});

/**
 * Store a lead in the database
 */
export const storeLead = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    organization: v.string(),
    role: v.string(),
    message: v.optional(v.string()),
    segment: segmentValidator,
    language: v.string(),
  },
  returns: v.id('leads'),
  handler: async (ctx, args) => {
    const leadId = await ctx.db.insert('leads', {
      name: args.name.trim(),
      email: args.email.toLowerCase().trim(),
      phone: args.phone?.trim() || undefined,
      organization: args.organization.trim(),
      role: args.role.trim(),
      message: args.message?.trim() || undefined,
      segment: args.segment,
      language: args.language,
      createdAt: Date.now(),
    });

    return leadId;
  },
});

/**
 * Generate HTML email template for lead notification
 */
function generateEmailHtml(lead: {
  name: string;
  email: string;
  phone?: string;
  organization: string;
  role: string;
  message?: string;
  segment: string;
  language: string;
}): string {
  const segmentLabels: Record<string, string> = {
    business: 'Business (HR/L&D)',
    edu: 'Education',
    executive: 'Executive',
  };

  const segmentLabel = segmentLabels[lead.segment] || lead.segment;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e3a5f; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 16px; }
    .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    .value { margin-top: 4px; font-size: 16px; }
    .segment-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 9999px; font-size: 14px; font-weight: 500; }
    .message-box { background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 8px; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 20px;">New Lead Submission</h1>
      <p style="margin: 8px 0 0; opacity: 0.9;">Bajkoterapia - ${segmentLabel} Segment</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">Segment</div>
        <div class="value"><span class="segment-badge">${segmentLabel}</span></div>
      </div>
      <div class="field">
        <div class="label">Name</div>
        <div class="value">${escapeHtml(lead.name)}</div>
      </div>
      <div class="field">
        <div class="label">Email</div>
        <div class="value"><a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a></div>
      </div>
      ${
        lead.phone
          ? `
      <div class="field">
        <div class="label">Phone</div>
        <div class="value"><a href="tel:${escapeHtml(lead.phone)}">${escapeHtml(lead.phone)}</a></div>
      </div>
      `
          : ''
      }
      <div class="field">
        <div class="label">Organization</div>
        <div class="value">${escapeHtml(lead.organization)}</div>
      </div>
      <div class="field">
        <div class="label">Role</div>
        <div class="value">${escapeHtml(lead.role)}</div>
      </div>
      ${
        lead.message
          ? `
      <div class="field">
        <div class="label">Message</div>
        <div class="message-box">${escapeHtml(lead.message)}</div>
      </div>
      `
          : ''
      }
      <div class="footer">
        <p>Submitted at: ${new Date().toISOString()}</p>
        <p>Language: ${lead.language}</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstileToken(token: string): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY) {
    return false;
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
      }).toString(),
    });

    if (!response.ok) {
      console.error('[leads] Turnstile verification failed with HTTP status:', response.status);
      return false;
    }

    const result = (await response.json()) as { success?: boolean; ['error-codes']?: string[] };
    if (!result.success) {
      console.warn('[leads] Turnstile rejected token', result['error-codes']);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[leads] Turnstile verification request failed:', error);
    return false;
  }
}

/**
 * Send email notification via Resend API
 */
async function sendEmailNotification(lead: {
  name: string;
  email: string;
  phone?: string;
  organization: string;
  role: string;
  message?: string;
  segment: string;
  language: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('[leads] RESEND_API_KEY not configured, skipping email notification');
    return { success: false, error: 'Email service not configured' };
  }

  const segmentLabels: Record<string, string> = {
    business: 'Business',
    edu: 'Education',
    executive: 'Executive',
  };

  const segmentLabel = segmentLabels[lead.segment] || lead.segment;

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bajkoterapia <info@bajkot.pl>',
        to: ['ljadach@gmail.com', 'cezdmo@gmail.com'],
        subject: `New Lead: ${segmentLabel} - ${lead.organization}`,
        html: generateEmailHtml(lead),
        reply_to: lead.email,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[leads] Resend API error:', response.status, errorText);
      return { success: false, error: `Email API error: ${response.status}` };
    }

    const result = await response.json();
    console.log('[leads] Email sent successfully:', result.id);
    return { success: true };
  } catch (error) {
    console.error('[leads] Failed to send email:', error);
    return { success: false, error: 'Failed to send email notification' };
  }
}

/**
 * Submit a lead from segment landing page
 *
 * - Validates input
 * - Checks rate limit by email
 * - Stores lead in database
 * - Sends email notification via Resend
 */
export const submitLead = action({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    organization: v.string(),
    role: v.string(),
    message: v.optional(v.string()),
    segment: segmentValidator,
    language: v.string(),
    honeypot: v.optional(v.string()),
    formStartedAt: v.optional(v.number()),
    captchaToken: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    if (args.honeypot && args.honeypot.trim().length > 0) {
      console.warn('[leads] Honeypot triggered - likely bot submission');
      // Pretend success to avoid giving bots feedback.
      return { success: true };
    }

    if (!args.formStartedAt || Date.now() - args.formStartedAt < MIN_FORM_FILL_TIME_MS) {
      return { success: false, error: 'Please take a moment to complete the form and try again.' };
    }

    // Basic validation
    if (!args.name.trim()) {
      return { success: false, error: 'Name is required' };
    }
    if (!args.email.trim() || !args.email.includes('@')) {
      return { success: false, error: 'Valid email is required' };
    }
    if (!args.organization.trim()) {
      return { success: false, error: 'Organization is required' };
    }
    if (!args.role.trim()) {
      return { success: false, error: 'Role is required' };
    }

    // Global anti-spam limit
    const globalRateLimit = await ctx.runQuery(internal.leads.checkGlobalRateLimit, {});
    if (!globalRateLimit.allowed) {
      return {
        success: false,
        error: 'Too many requests right now. Please try again in a few minutes.',
      };
    }

    // Bot protection (Cloudflare Turnstile)
    if (CAPTCHA_REQUIRED) {
      if (!args.captchaToken?.trim()) {
        return { success: false, error: 'Captcha verification failed. Please try again.' };
      }
      const captchaValid = await verifyTurnstileToken(args.captchaToken.trim());
      if (!captchaValid) {
        return { success: false, error: 'Captcha verification failed. Please try again.' };
      }
    }

    // Check rate limit
    const rateLimit = await ctx.runQuery(internal.leads.checkEmailRateLimit, {
      email: args.email,
    });

    if (!rateLimit.allowed) {
      return {
        success: false,
        error: 'You have already submitted a request recently. Please try again later.',
      };
    }

    // Store lead in database
    try {
      await ctx.runMutation(internal.leads.storeLead, {
        name: args.name,
        email: args.email,
        phone: args.phone,
        organization: args.organization,
        role: args.role,
        message: args.message,
        segment: args.segment,
        language: args.language,
      });
    } catch (error) {
      console.error('[leads] Failed to store lead:', error);
      return { success: false, error: 'Failed to save your request. Please try again.' };
    }

    // Send email notification (non-blocking - don't fail if email fails)
    const emailResult = await sendEmailNotification({
      name: args.name,
      email: args.email,
      phone: args.phone,
      organization: args.organization,
      role: args.role,
      message: args.message,
      segment: args.segment,
      language: args.language,
    });

    if (!emailResult.success) {
      console.warn('[leads] Email notification failed, but lead was stored:', emailResult.error);
    }

    return { success: true };
  },
});
