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
const DEFAULT_REPLY_TO = 'info@bajkoterapia.org';

// Display-only prices. Stripe is the source of truth via STRIPE_BOOK_PRICE_ID.
// Mirrors src/lib/pricing.ts — if one changes, change the other.
const BOOK_PRICE_PDF_PLN = 29;
const BOOK_PRICE_PRINT_PLN = 49;

const DOWNLOAD_LINK_TTL_DAYS = 30;

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
      replyTo: DEFAULT_REPLY_TO,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    if (error) {
      console.error('[email] Resend returned error:', error);
      return { ok: false, error: error.message ?? JSON.stringify(error) };
    }
    console.log(`[email] Sent ${data?.id ?? '(no id)'} to ${params.to}`);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[email] Unexpected error:', msg);
    return { ok: false, error: msg };
  }
}

export type BookFormat = 'pdf' | 'pdf_print';

export function formatOrderNumber(orderId: string): string {
  // Public-facing short code — last 12 chars of the Convex id, matches CLI.
  const tail = orderId.slice(-12).toUpperCase();
  return `BJK-${tail}`;
}

function formatLabel(format: BookFormat): string {
  return format === 'pdf_print' ? 'PDF + Druk' : 'PDF';
}

function priceForFormat(format: BookFormat): number {
  return format === 'pdf_print' ? BOOK_PRICE_PRINT_PLN : BOOK_PRICE_PDF_PLN;
}

function formatPlExpiryDate(createdAtMs: number): string {
  const expiry = new Date(createdAtMs + DOWNLOAD_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(expiry);
}

// ────────────────────────────────────────────────────────────────
// Email 1 — Order confirmation, sent immediately after Stripe payment.
// ────────────────────────────────────────────────────────────────

export interface OrderConfirmationParams {
  childName: string;
  childAge: number | string | null;
  problemTitle: string;
  format: BookFormat;
  orderNumber: string;
}

export function buildOrderConfirmationEmail(params: OrderConfirmationParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { childName, childAge, problemTitle, format, orderNumber } = params;
  const childNameEsc = escapeHtml(childName);
  const problemEsc = escapeHtml(problemTitle);
  const ageDisplay = childAge != null && childAge !== '' ? String(childAge) : '—';
  const formatStr = formatLabel(format);
  const price = priceForFormat(format);
  const dla = dlaName(childName);
  const dlaPhrase = dla ?? `dla ${childName}`;
  const dlaPhraseEsc = escapeHtml(dlaPhrase);
  const printRow =
    format === 'pdf_print'
      ? `
        <div style="display:block;margin-bottom:14px;">
          <div style="display:inline-block;vertical-align:top;background:#fef3c7;color:#d97706;width:32px;height:32px;border-radius:50%;text-align:center;font-weight:800;line-height:32px;margin-right:14px;">3</div>
          <div style="display:inline-block;vertical-align:top;width:calc(100% - 60px);"><strong style="color:#0c4a6e;">Drukowana książeczka wyruszy do Was kurierem</strong> w 3–5 dni roboczych.</div>
        </div>`
      : '';

  const subject = `Mamy Twoje zamówienie ✨ — bajka ${dlaPhrase} już powstaje`;
  const preheader = `Numer zamówienia ${orderNumber}. Za ~15 minut wyślemy gotowy PDF.`;

  const html = `<!doctype html>
<html lang="pl">
  <head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background:#F5F7FA;font-family:Nunito,Arial,sans-serif;color:#334155;">
    <span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;color:#F5F7FA;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px -8px rgba(15,23,42,0.12);overflow:hidden;">
          <tr><td style="background:linear-gradient(135deg,#f0f9ff 0%,#ffffff 100%);padding:32px 24px;text-align:center;border-bottom:1px solid #e0f2fe;">
            <div style="color:#075985;font-weight:800;font-size:22px;">📖 Bajkoterapia</div>
          </td></tr>

          <tr><td style="padding:36px 28px;font-size:16px;line-height:1.65;color:#334155;">
            <h1 style="font-size:28px;font-weight:900;color:#0c4a6e;margin:0 0 20px 0;line-height:1.2;">Cześć! 👋</h1>

            <p style="margin:0 0 16px 0;">
              Mamy Twoje zamówienie i już bierzemy się do pracy. Spersonalizowana bajka <strong>${dlaPhraseEsc}</strong> jest właśnie tworzona — dopisujemy imię, dostosowujemy bohatera do wyglądu Twojego malucha i dobieramy ilustracje pod wybrany temat.
            </p>

            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:16px;padding:20px;margin:24px 0;">
              <div style="font-size:12px;font-weight:800;color:#0284c7;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;">Podsumowanie zamówienia</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;">
                <tr><td style="padding:4px 0;color:#64748b;">Numer zamówienia</td><td style="text-align:right;font-weight:700;color:#0c4a6e;">${escapeHtml(orderNumber)}</td></tr>
                <tr><td style="padding:4px 0;color:#64748b;">Bohater bajki</td><td style="text-align:right;font-weight:700;color:#0c4a6e;">${childNameEsc}, lat ${escapeHtml(ageDisplay)}</td></tr>
                <tr><td style="padding:4px 0;color:#64748b;">Temat</td><td style="text-align:right;font-weight:700;color:#0c4a6e;">${problemEsc}</td></tr>
                <tr><td style="padding:4px 0;color:#64748b;">Format</td><td style="text-align:right;font-weight:700;color:#0c4a6e;">${escapeHtml(formatStr)}</td></tr>
                <tr><td style="padding:4px 0;color:#64748b;">Kwota</td><td style="text-align:right;font-weight:800;color:#d97706;font-size:17px;">${price} zł</td></tr>
              </table>
            </div>

            <h2 style="font-size:18px;font-weight:800;color:#0c4a6e;margin:24px 0 12px 0;">Co teraz?</h2>

            <div style="margin:16px 0;">
              <div style="display:block;margin-bottom:14px;">
                <div style="display:inline-block;vertical-align:top;background:#fef3c7;color:#d97706;width:32px;height:32px;border-radius:50%;text-align:center;font-weight:800;line-height:32px;margin-right:14px;">1</div>
                <div style="display:inline-block;vertical-align:top;width:calc(100% - 60px);"><strong style="color:#0c4a6e;">Tworzymy Twoją bajkę</strong> — to zajmie nam około <strong>15 minut</strong>. Bez pośpiechu, ale szybko.</div>
              </div>
              <div style="display:block;margin-bottom:14px;">
                <div style="display:inline-block;vertical-align:top;background:#fef3c7;color:#d97706;width:32px;height:32px;border-radius:50%;text-align:center;font-weight:800;line-height:32px;margin-right:14px;">2</div>
                <div style="display:inline-block;vertical-align:top;width:calc(100% - 60px);"><strong style="color:#0c4a6e;">Wyślemy Ci PDF mailem</strong> — dokładnie na ten adres, z którego czytasz tę wiadomość.</div>
              </div>${printRow}
            </div>

            <div style="background:#fefce8;border-left:3px solid #f59e0b;padding:14px 18px;border-radius:8px;margin:24px 0;font-size:14px;">
              <strong style="color:#92400e;">📄 Faktura VAT</strong> — wystawimy ją automatycznie i dołączymy do maila z gotową bajką. Jeśli potrzebujesz danych firmowych, odpisz na tego maila do końca dnia.
            </div>

            <p style="margin:24px 0 0 0;">
              Coś się nie zgadza? Chcesz zmienić temat lub zaktualizować dane bohatera? Po prostu odpisz na tę wiadomość — Łukasz albo Andrzej zajmiemy się Wami osobiście.
            </p>

            <p style="margin:16px 0 0 0;">
              Trzymajcie się ciepło,<br>
              <strong style="color:#0c4a6e;">Andrzej i Łukasz</strong><br>
              <span style="color:#64748b;font-size:14px;">założyciele Bajkoterapii i przede wszystkim — tatusiowie 💙</span>
            </p>
          </td></tr>

          <tr><td style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
            <div style="margin-bottom:8px;"><strong style="color:#0c4a6e;">Bajkoterapia</strong> by Trustee Interactive · Plac Inwalidów 10, 01-552 Warszawa</div>
            <div><a href="mailto:info@bajkoterapia.org" style="color:#0284c7;text-decoration:none;">info@bajkoterapia.org</a> · <a href="https://www.bajkoterapia.org" style="color:#0284c7;text-decoration:none;">bajkoterapia.org</a></div>
            <div style="margin-top:12px;">Otrzymujesz tę wiadomość, ponieważ złożyłeś u nas zamówienie. To mail transakcyjny — nie wymaga rezygnacji.</div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const printStep =
    format === 'pdf_print' ? '3. Drukowana książeczka wyruszy kurierem w 3–5 dni roboczych.\n' : '';
  const text = [
    `Cześć!`,
    '',
    `Mamy Twoje zamówienie i już bierzemy się do pracy. Spersonalizowana bajka ${dlaPhrase} jest właśnie tworzona — dopisujemy imię, dostosowujemy bohatera do wyglądu Twojego malucha i dobieramy ilustracje pod wybrany temat.`,
    '',
    'PODSUMOWANIE ZAMÓWIENIA',
    `- Numer zamówienia: ${orderNumber}`,
    `- Bohater bajki: ${childName}, lat ${ageDisplay}`,
    `- Temat: ${problemTitle}`,
    `- Format: ${formatStr}`,
    `- Kwota: ${price} zł`,
    '',
    'CO TERAZ?',
    '1. Tworzymy Twoją bajkę — to zajmie około 15 minut.',
    '2. Wyślemy Ci PDF mailem na ten sam adres.',
    printStep +
      'FAKTURA VAT — wystawimy ją automatycznie. Potrzebujesz danych firmowych? Odpisz na tę wiadomość do końca dnia.',
    '',
    'Coś się nie zgadza? Po prostu odpisz na tę wiadomość — zajmiemy się Wami osobiście.',
    '',
    'Trzymajcie się ciepło,',
    'Andrzej i Łukasz',
    'założyciele Bajkoterapii i tatusiowie',
    '',
    '—',
    'Bajkoterapia by Trustee Interactive',
    'Plac Inwalidów 10, 01-552 Warszawa',
    'info@bajkoterapia.org · bajkoterapia.org',
  ].join('\n');

  return { subject, html, text };
}

// ────────────────────────────────────────────────────────────────
// Email 3 — Book ready, link to download (no attachment).
// ────────────────────────────────────────────────────────────────

export interface BookReadyParams {
  childName: string;
  bookTitle: string | null;
  downloadUrl: string;
  resultUrl: string;
  format: BookFormat;
  orderCreatedAtMs: number;
}

export function buildBookReadyEmail(params: BookReadyParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { childName, bookTitle, downloadUrl, resultUrl, format, orderCreatedAtMs } = params;
  // Polish "dla X" needs the genitive form of the name. Helper returns the
  // full "dla {Genitive}" phrase or null when the heuristic can't produce one.
  const dla = dlaName(childName);
  const dlaPhrase = dla ?? `dla ${childName}`;
  const dlaPhraseEsc = escapeHtml(dlaPhrase);
  const expiryDate = formatPlExpiryDate(orderCreatedAtMs);
  const titleStr = bookTitle?.trim() || null;
  const titleEsc = titleStr ? escapeHtml(titleStr) : null;

  const subject = `📖 Bajka ${dlaPhrase} czeka na pobranie`;
  const preheader = `Kliknij i pobierz PDF z gotową książeczką. Link aktywny do ${expiryDate}.`;

  const titleClause = titleEsc
    ? `Bajka <em>„${titleEsc}"</em> jest gotowa.`
    : `Spersonalizowana bajka ${dlaPhraseEsc} jest gotowa.`;

  const printBlock =
    format === 'pdf_print'
      ? `<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:16px 18px;margin:24px 0;font-size:14px;color:#78350f;">
            <strong>📦 Drukowana wersja w drodze!</strong> Profesjonalnie oprawiona książeczka jest właśnie pakowana — wyślemy ją kurierem w 3–5 dni roboczych.
          </div>`
      : '';

  const html = `<!doctype html>
<html lang="pl">
  <head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background:#F5F7FA;font-family:Nunito,Arial,sans-serif;color:#334155;">
    <span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;color:#F5F7FA;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px -8px rgba(15,23,42,0.12);overflow:hidden;">
          <tr><td style="background:linear-gradient(135deg,#f0f9ff 0%,#ffffff 100%);padding:32px 24px;text-align:center;border-bottom:1px solid #e0f2fe;">
            <div style="color:#075985;font-weight:800;font-size:22px;">📖 Bajkoterapia</div>
          </td></tr>

          <tr><td style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);padding:36px 28px;text-align:center;">
            <div style="font-size:56px;line-height:1;margin-bottom:14px;">📖✨</div>
            <h1 style="font-size:30px;font-weight:900;color:#92400e;margin:0 0 8px 0;line-height:1.2;">Twoja bajka jest gotowa!</h1>
            <p style="font-size:17px;color:#78350f;margin:0;font-weight:600;">Książeczka ${dlaPhraseEsc} czeka pod jednym kliknięciem.</p>
          </td></tr>

          <tr><td style="padding:36px 28px;font-size:16px;line-height:1.65;color:#334155;">
            <p style="margin:0 0 16px 0;">Cześć!</p>
            <p style="margin:0 0 24px 0;">${titleClause} Plik PDF czeka pod poniższym przyciskiem — pobierzcie go na komputer, telefon albo wydrukujcie w domu.</p>

            <div style="text-align:center;margin:28px 0;">
              <a href="${escapeAttr(downloadUrl)}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#ffffff;font-weight:800;font-size:17px;padding:16px 36px;border-radius:999px;text-decoration:none;box-shadow:0 8px 20px -8px rgba(245,158,11,0.5);">
                ⬇ Pobierz bajkę (PDF)
              </a>
              <div style="margin-top:10px;font-size:13px;color:#64748b;">Format A5 · PDF</div>
            </div>

            <div style="background:#fef2f2;border-left:3px solid #dc2626;padding:14px 18px;border-radius:8px;margin:24px 0;font-size:14px;color:#7f1d1d;">
              <strong>⏱️ Link aktywny do ${escapeHtml(expiryDate)}</strong> (${DOWNLOAD_LINK_TTL_DAYS} dni od zakupu). Po tym czasie pobranie wymaga kontaktu z nami — ale spokojnie, plik jest u nas zarchiwizowany na zawsze.
            </div>

            <p style="margin:18px 0;font-size:13px;color:#64748b;">
              Przycisk nie działa? Otwórz <a href="${escapeAttr(resultUrl)}" style="color:#0284c7;">stronę z bajką</a> albo wklej link do przeglądarki:<br>
              <a href="${escapeAttr(downloadUrl)}" style="color:#0284c7;word-break:break-all;">${escapeHtml(downloadUrl)}</a>
            </p>

            <h2 style="font-size:18px;font-weight:800;color:#0c4a6e;margin:28px 0 12px 0;">💡 Zanim zaczniecie czytać</h2>
            <div style="margin:16px 0;">
              <div style="background:#f0f9ff;border-radius:12px;padding:16px 18px;margin-bottom:10px;"><strong style="color:#0c4a6e;">Czytajcie razem, w spokoju.</strong> <span style="color:#475569;">Najlepiej wieczorem, bez pośpiechu, bez telefonów.</span></div>
              <div style="background:#f0f9ff;border-radius:12px;padding:16px 18px;margin-bottom:10px;"><strong style="color:#0c4a6e;">Pytajcie o emocje.</strong> <span style="color:#475569;">„Co czuł bohater?", „Co mu pomogło?" — te pytania potrajają skuteczność bajki.</span></div>
              <div style="background:#f0f9ff;border-radius:12px;padding:16px 18px;"><strong style="color:#0c4a6e;">Wracajcie do bajki.</strong> <span style="color:#475569;">Im częściej, tym lepiej. Na końcu PDF-u znajdziesz 5 pytań do rozmowy.</span></div>
            </div>

            ${printBlock}

            <p style="margin:24px 0 0 0;">Po przeczytaniu — daj nam znać, jak poszło. Możesz po prostu odpisać na tę wiadomość ✉️</p>

            <p style="margin:16px 0 0 0;">
              Dobrego wieczoru,<br>
              <strong style="color:#0c4a6e;">Andrzej i Łukasz</strong><br>
              <span style="color:#64748b;font-size:14px;">założyciele Bajkoterapii i przede wszystkim — tatusiowie 💙</span>
            </p>
          </td></tr>

          <tr><td style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
            <div style="margin-bottom:8px;"><strong style="color:#0c4a6e;">Bajkoterapia</strong> by Trustee Interactive · Plac Inwalidów 10, 01-552 Warszawa</div>
            <div><a href="mailto:info@bajkoterapia.org" style="color:#0284c7;text-decoration:none;">info@bajkoterapia.org</a> · <a href="https://www.bajkoterapia.org" style="color:#0284c7;text-decoration:none;">bajkoterapia.org</a></div>
            <div style="margin-top:12px;max-width:380px;margin-left:auto;margin-right:auto;">Plik PDF jest objęty 14-dniową gwarancją zwrotu. Bajka jest psychoedukacyjna i nie zastępuje konsultacji ze specjalistą.</div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const titleLine = titleStr
    ? `Bajka „${titleStr}" jest gotowa.`
    : `Spersonalizowana bajka ${dlaPhrase} jest gotowa.`;
  const printLine =
    format === 'pdf_print'
      ? '\nDRUKOWANA WERSJA: Książeczka jest pakowana — wyślemy ją kurierem w 3–5 dni roboczych.\n'
      : '';
  const text = [
    `Cześć!`,
    '',
    `${titleLine} Plik PDF czeka pod tym linkiem — pobierzcie go na komputer, telefon albo wydrukujcie w domu:`,
    '',
    `>> POBIERZ BAJKĘ (PDF) <<`,
    downloadUrl,
    '',
    `Format A5 · PDF`,
    '',
    `UWAGA: Link aktywny do ${expiryDate} (${DOWNLOAD_LINK_TTL_DAYS} dni od zakupu). Po tym czasie pobranie wymaga kontaktu z nami.`,
    '',
    `Strona z bajką: ${resultUrl}`,
    '',
    'ZANIM ZACZNIECIE CZYTAĆ',
    '- Czytajcie razem, wieczorem, bez pośpiechu.',
    '- Pytajcie o emocje: „Co czuł bohater?", „Co mu pomogło?". To podwaja skuteczność.',
    '- Wracajcie do bajki. Na końcu PDF-u znajdziecie 5 pytań do rozmowy.',
    printLine,
    'Po przeczytaniu daj nam znać, jak poszło. Po prostu odpisz na tę wiadomość.',
    '',
    'Dobrego wieczoru,',
    'Andrzej i Łukasz',
    'założyciele Bajkoterapii i tatusiowie',
    '',
    '—',
    'Bajkoterapia by Trustee Interactive',
    'Plac Inwalidów 10, 01-552 Warszawa',
    'info@bajkoterapia.org · bajkoterapia.org',
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
