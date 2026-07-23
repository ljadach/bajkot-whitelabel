'use node';

/**
 * Admin outbound email — lets the team send one-off messages as
 * "Bajkoterapia <info@bajkoterapia.org>" (Resend) straight from the admin
 * panel: To / CC / BCC / attachments. Plain-text body is wrapped in the
 * shared branded shell (lib/email.ts) so replies land in a normal thread.
 */

import { action, internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { v, type ObjectType } from 'convex/values';
import { assertAdmin } from '../lib/roles';
import { buildAdminBroadcastEmail, sendEmail } from '../lib/email';
import { MAX_ATTACHMENT_TOTAL_BYTES } from '../lib/emailLimits';

const MAX_RECIPIENTS = 20;

const sendArgs = {
  to: v.array(v.string()),
  cc: v.optional(v.array(v.string())),
  bcc: v.optional(v.array(v.string())),
  subject: v.string(),
  body: v.string(),
  attachments: v.optional(
    v.array(
      v.object({
        filename: v.string(),
        contentBase64: v.string(),
      }),
    ),
  ),
};

type SendArgs = ObjectType<typeof sendArgs>;

const sendReturns = v.object({
  ok: v.boolean(),
  error: v.optional(v.string()),
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSendArgs(args: SendArgs): void {
  const all = [...args.to, ...(args.cc ?? []), ...(args.bcc ?? [])];
  if (args.to.length === 0) throw new Error('Podaj co najmniej jednego odbiorcę');
  if (all.length > MAX_RECIPIENTS) throw new Error(`Za dużo odbiorców (max ${MAX_RECIPIENTS})`);
  for (const addr of all) {
    if (!EMAIL_RE.test(addr)) throw new Error(`Nieprawidłowy adres: ${addr}`);
  }
  const totalAttachmentBytes = (args.attachments ?? []).reduce(
    // base64 → raw bytes: 3/4 of the string length, padding is negligible here
    (sum, a) => sum + Math.floor((a.contentBase64.length * 3) / 4),
    0,
  );
  if (totalAttachmentBytes > MAX_ATTACHMENT_TOTAL_BYTES) {
    throw new Error(
      `Załączniki za duże (${(totalAttachmentBytes / 1024 / 1024).toFixed(1)} MB, max ${MAX_ATTACHMENT_TOTAL_BYTES / 1024 / 1024} MB łącznie)`,
    );
  }
}

async function doSend(args: SendArgs): Promise<{ ok: boolean; error?: string }> {
  validateSendArgs(args);
  return sendEmail({
    to: args.to,
    cc: args.cc?.length ? args.cc : undefined,
    bcc: args.bcc?.length ? args.bcc : undefined,
    subject: args.subject,
    html: buildAdminBroadcastEmail(args.body).html,
    text: args.body,
    attachments: args.attachments?.length ? args.attachments : undefined,
  });
}

export const sendAdminEmail = action({
  args: sendArgs,
  returns: sendReturns,
  handler: async (ctx, args) => {
    const { subject: actor } = await assertAdmin(ctx);
    const result = await doSend(args);
    await ctx.runMutation(internal.admin.audit.logAdminAction, {
      actor,
      action: 'adminEmail.send',
      target: args.to.join(', '),
      details: {
        subject: args.subject,
        cc: args.cc?.length ?? 0,
        bcc: args.bcc?.length ?? 0,
        attachments: args.attachments?.length ?? 0,
        ok: result.ok,
      },
    });
    return result;
  },
});

/** CLI/test variant — same send path, no Clerk auth (npx convex run only). */
export const sendAdminEmailInternal = internalAction({
  args: sendArgs,
  returns: sendReturns,
  handler: async (_ctx, args) => {
    return doSend(args);
  },
});
