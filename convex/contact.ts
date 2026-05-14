/**
 * Contact Form Submissions
 *
 * Handles:
 * - Contact form submission from /about/contact page
 * - Rate limiting by email (prevent spam)
 * - DB storage only (no email notifications for now)
 */

import { action, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS_PER_EMAIL = 2;

const inquiryTypeValidator = v.union(
  v.literal('enterprise_sales'),
  v.literal('technical_support'),
  v.literal('partnerships'),
  v.literal('press_media'),
  v.literal('general'),
  v.literal('print_upgrade'),
);

/**
 * Check if an email has been submitted recently (rate limiting)
 */
export const checkContactRateLimit = internalQuery({
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

    const recentSubmissions = await ctx.db
      .query('contactSubmissions')
      .withIndex('by_email_and_created', (q) =>
        q.eq('email', normalizedEmail).gte('createdAt', windowStart),
      )
      .collect();

    const recentCount = recentSubmissions.length;
    const allowed = recentCount < MAX_SUBMISSIONS_PER_EMAIL;

    return { allowed, recentCount };
  },
});

/**
 * Store a contact submission in the database
 */
export const storeContactSubmission = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    inquiryType: inquiryTypeValidator,
    question: v.string(),
    language: v.string(),
  },
  returns: v.id('contactSubmissions'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('contactSubmissions', {
      name: args.name.trim(),
      email: args.email.toLowerCase().trim(),
      inquiryType: args.inquiryType,
      question: args.question.trim(),
      language: args.language,
      createdAt: Date.now(),
    });
  },
});

/**
 * Submit a contact form from /about/contact page
 *
 * - Validates input
 * - Checks rate limit by email
 * - Stores submission in database
 */
export const submitContactForm = action({
  args: {
    name: v.string(),
    email: v.string(),
    inquiryType: inquiryTypeValidator,
    question: v.string(),
    language: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    if (!args.name.trim()) {
      return { success: false, error: 'Name is required' };
    }
    if (!args.email.trim() || !args.email.includes('@')) {
      return { success: false, error: 'Valid email is required' };
    }
    if (!args.question.trim()) {
      return { success: false, error: 'Question is required' };
    }

    const rateLimit = await ctx.runQuery(internal.contact.checkContactRateLimit, {
      email: args.email,
    });

    if (!rateLimit.allowed) {
      return {
        success: false,
        error: 'You have already submitted a request recently. Please try again later.',
      };
    }

    try {
      await ctx.runMutation(internal.contact.storeContactSubmission, {
        name: args.name,
        email: args.email,
        inquiryType: args.inquiryType,
        question: args.question,
        language: args.language,
      });
    } catch (error) {
      console.error('[contact] Failed to store submission:', error);
      return { success: false, error: 'Failed to save your message. Please try again.' };
    }

    return { success: true };
  },
});
