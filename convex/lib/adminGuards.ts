/**
 * Admin guards: rate limiting, audit logging, bulk size limits, config validation.
 */

import { GenericMutationCtx } from 'convex/server';
import { DataModel } from '../_generated/dataModel';
import { checkRateLimit } from './rateLimiter';

// ── Bulk operation limits ─────────────────────────────────────

const MAX_BULK_SIZE = 200;

export function assertBulkLimit(ids: unknown[], label = 'items') {
  if (ids.length > MAX_BULK_SIZE) {
    throw new Error(`Too many ${label}: max ${MAX_BULK_SIZE} per request, got ${ids.length}`);
  }
}

// ── Admin rate limiting ───────────────────────────────────────

export async function checkAdminRateLimit(ctx: GenericMutationCtx<DataModel>, clerkUserId: string): Promise<void> {
  const result = await checkRateLimit(ctx, clerkUserId, 'admin_action');
  if (!result.allowed) {
    throw new Error(result.message ?? 'Admin rate limit exceeded');
  }
}

// ── Audit log ─────────────────────────────────────────────────

export async function auditLog(ctx: GenericMutationCtx<DataModel>, actor: string, action: string, target?: string, details?: Record<string, unknown>): Promise<void> {
  await ctx.db.insert('adminAuditLog', {
    actor,
    action,
    target,
    details: details ? JSON.stringify(details) : undefined,
    timestamp: Date.now(),
  });
}

// ── Config validation ─────────────────────────────────────────

const CONFIG_VALIDATORS: Record<string, (value: string) => void> = {
  google_drive_url: (v) => {
    if (v && !v.includes('drive.google.com')) {
      throw new Error('Invalid Google Drive URL');
    }
  },
  llm_model: (v) => {
    if (v && !v.startsWith('gemini-') && !v.startsWith('google/')) {
      throw new Error('Model must start with "gemini-" (e.g. gemini-2.0-flash-001)');
    }
  },
  min_segment_duration: assertPositiveNumber,
  max_segment_duration: assertPositiveNumber,
  processing_chunk_minutes: assertPositiveNumber,
  processing_overlap_seconds: assertPositiveNumber,
};

function assertPositiveNumber(v: string) {
  if (v) {
    const n = Number(v);
    if (isNaN(n) || n < 0) {
      throw new Error(`Value must be a positive number, got "${v}"`);
    }
  }
}

export function validateConfigValue(key: string, value: string): void {
  const validator = CONFIG_VALIDATORS[key];
  if (validator) {
    validator(value);
  }
}
