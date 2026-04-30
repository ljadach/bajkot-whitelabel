'use node';

/**
 * Resend email integration. Internal helper around the SDK so the rest of
 * the pipeline never has to think about the API key, sender domain or
 * branding boilerplate.
 *
 * Env vars (Convex dashboard, both prod and dev):
 *   RESEND_API_KEY    — required for actual sends
 *   EMAIL_FROM        — defaults to "Bajkoterapia <info@bajkoterapia.org>"
 *
 * If RESEND_API_KEY is missing the helper logs a warning and no-ops, so
 * dev environments without the key don't break the pipeline.
 */

import { Resend } from 'resend';
import { dlaName } from './childNameInflect';

const DEFAULT_FROM = 'Bajkoterapia <info@bajkoterapia.org>';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let resendInstance: Resend | null = null;
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendInstance) resendInstance = new Resend(apiKey);
  return resendInstance;
}

export async function sendEmail(params: SendEmailParams): Promise<{ ok: boolean; error?: string }> {
  const client = getResend();
  if (!client) {
    console.warn('[email] RESEND_API_KEY missing — skipping send to', params.to);
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;
  try {
    const { data, error } = await client.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    if (error) {
      console.error('[email] Resend returned error:', error);
      return { ok: false, error: error.message ?? String(error) };
    }
    console.log(`[email] Sent ${data?.id ?? '(no id)'} to ${params.to}`);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[email] Unexpected error:', msg);
    return { ok: false, error: msg };
  }
}

/**
 * Build the "Twoja bajka jest gotowa" email sent right after a successful
 * Stripe payment. Keeps the layout simple and inline so it works in the
 * widest possible spread of mail clients (no external CSS).
 */
export function buildBookReadyEmail(params: {
  childName: string;
  bookTitle: string | null;
  downloadUrl: string;
  resultUrl: string;
}): { subject: string; html: string; text: string } {
  // Polish "dla X" needs the genitive form of the name. Helper returns
  // the full "dla {Genitive}" phrase or null when the heuristic can't
  // produce one — we then fall back to nominative without "dla".
  const dla = dlaName(params.childName);
  const dlaPhrase = dla ?? params.childName;

  // Headline / subject. When the LLM gave us a real title we lead with it,
  // otherwise we describe the book by recipient. Either way "dla {name}"
  // appears at most once.
  const subject = params.bookTitle
    ? `Bajka „${params.bookTitle}" jest gotowa`
    : dla
      ? `Spersonalizowana bajka ${dla} jest gotowa`
      : `Twoja bajka jest gotowa, ${params.childName}`;

  const titleHtml = params.bookTitle ? `<strong>„${escapeHtml(params.bookTitle)}"</strong>` : null;

  const descriptionHtml = titleHtml
    ? `Spersonalizowana bajka ${titleHtml}${dla ? ` ${escapeHtml(dla)}` : `, ${escapeHtml(params.childName)},`} czeka na Ciebie.`
    : dla
      ? `Spersonalizowana bajka ${escapeHtml(dla)} czeka na Ciebie.`
      : `Twoja spersonalizowana bajka, ${escapeHtml(params.childName)}, czeka na Ciebie.`;

  const html = `<!doctype html>
<html lang="pl">
  <body style="margin:0;padding:0;background:#FAFAFA;font-family:Nunito,Arial,sans-serif;color:#334155;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAFA;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:24px;box-shadow:0 8px 24px rgba(15,23,42,0.08);padding:40px;">
            <tr><td align="center" style="font-size:48px;line-height:1;">📖✨</td></tr>
            <tr><td align="center" style="padding-top:24px;font-size:14px;font-weight:700;color:#7c3aed;letter-spacing:0.12em;text-transform:uppercase;">Bajkoterapia</td></tr>
            <tr><td align="center" style="padding-top:8px;font-size:24px;font-weight:800;color:#0f172a;line-height:1.25;">${escapeHtml(subject)}</td></tr>
            <tr><td align="center" style="padding-top:16px;font-size:16px;line-height:1.5;color:#475569;">
              ${descriptionHtml}<br/>
              Kliknij poniżej, żeby pobrać PDF.
            </td></tr>
            <tr><td align="center" style="padding-top:32px;">
              <a href="${escapeAttr(params.downloadUrl)}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:14px;font-size:16px;">
                Pobierz PDF
              </a>
            </td></tr>
            <tr><td align="center" style="padding-top:16px;font-size:13px;color:#64748b;">
              Link działa też tu: <a href="${escapeAttr(params.resultUrl)}" style="color:#7c3aed;">otwórz stronę z bajką</a>.
            </td></tr>
            <tr><td style="padding-top:32px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;line-height:1.6;text-align:center;">
              Bajkoterapia.org · Spersonalizowane bajki terapeutyczne dla dzieci.<br/>
              Jeśli masz pytania, odpowiedz na ten mail — czytamy każdy.
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textBody = params.bookTitle
    ? `Spersonalizowana bajka „${params.bookTitle}" ${dlaPhrase} czeka.`
    : dla
      ? `Spersonalizowana bajka ${dla} czeka.`
      : `Twoja spersonalizowana bajka, ${params.childName}, czeka.`;
  const text = [
    subject,
    '',
    textBody,
    '',
    `Pobierz PDF: ${params.downloadUrl}`,
    `Strona z bajką: ${params.resultUrl}`,
    '',
    '— Bajkoterapia',
  ].join('\n');
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
