'use node';

/**
 * Admin outbound email — lets the team send one-off messages as
 * "Bajkoterapia <info@bajkoterapia.org>" (Resend) straight from the admin
 * panel: To / CC / BCC / attachments. Plain-text body is wrapped in a
 * minimal branded HTML shell so replies land in a normal thread.
 */

import { action, internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';
import { assertAdmin } from '../lib/roles';
import { sendEmail, type EmailAttachment } from '../lib/email';

// Resend caps the whole message at 40MB; Convex action args at 16MB.
// Base64 inflates ~4/3, so keep the raw payload comfortably below both.
const MAX_ATTACHMENT_TOTAL_BYTES = 10 * 1024 * 1024;
const MAX_RECIPIENTS = 20;

const attachmentValidator = v.object({
  filename: v.string(),
  contentBase64: v.string(),
});

const sendArgs = {
  to: v.array(v.string()),
  cc: v.optional(v.array(v.string())),
  bcc: v.optional(v.array(v.string())),
  subject: v.string(),
  body: v.string(),
  attachments: v.optional(v.array(attachmentValidator)),
};

const sendReturns = v.object({
  ok: v.boolean(),
  error: v.optional(v.string()),
});

interface SendArgs {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRecipients(args: SendArgs): void {
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

function buildAdminEmailHtml(body: string): string {
  const bodyHtml = escapeHtml(body).replace(/\n/g, '<br>');
  return `<!doctype html>
<html lang="pl">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#F5F7FA;font-family:Nunito,Arial,sans-serif;color:#334155;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px -8px rgba(15,23,42,0.12);overflow:hidden;">
          <tr><td style="background:linear-gradient(135deg,#f0f9ff 0%,#ffffff 100%);padding:24px;text-align:center;border-bottom:1px solid #e0f2fe;">
            <div style="color:#075985;font-weight:800;font-size:20px;">📖 Bajkoterapia</div>
          </td></tr>
          <tr><td style="padding:32px 28px;font-size:15px;line-height:1.65;color:#334155;">${bodyHtml}</td></tr>
          <tr><td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
            <div style="margin-bottom:6px;"><strong style="color:#0c4a6e;">Bajkoterapia</strong> by Trustee Interactive · Plac Inwalidów 10, 01-552 Warszawa</div>
            <div><a href="mailto:info@bajkoterapia.org" style="color:#0284c7;text-decoration:none;">info@bajkoterapia.org</a> · <a href="https://www.bajkoterapia.org" style="color:#0284c7;text-decoration:none;">bajkoterapia.org</a></div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

async function doSend(args: SendArgs): Promise<{ ok: boolean; error?: string }> {
  validateRecipients(args);
  return sendEmail({
    to: args.to,
    cc: args.cc?.length ? args.cc : undefined,
    bcc: args.bcc?.length ? args.bcc : undefined,
    subject: args.subject,
    html: buildAdminEmailHtml(args.body),
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
      details: `subject="${args.subject}" cc=${args.cc?.length ?? 0} bcc=${args.bcc?.length ?? 0} attachments=${args.attachments?.length ?? 0} ok=${result.ok}`,
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
