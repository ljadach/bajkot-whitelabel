'use node';

/**
 * Resend email integration plus the transactional templates. Every
 * customer-facing template is rendered in the order's partner theme
 * (lib/partners.ts): name, logo, colours, support address.
 *
 * Env vars (Convex dashboard):
 *   RESEND_API_KEY  — required for actual sends
 *   EMAIL_FROM      — sender on a domain verified in Resend, e.g.
 *                     "bajki@twoja-domena.pl". The display name is replaced
 *                     with the partner's name per e-mail.
 *   EMAIL_REPLY_TO  — optional fallback reply-to when the partner has no
 *                     supportEmail
 *
 * If RESEND_API_KEY or EMAIL_FROM is missing the helper logs a warning and
 * no-ops, so environments without e-mail don't break the pipeline.
 */

import { Resend } from 'resend';
import { dlaName } from './childNameInflect';
import { paletteFromHex, textColorOn, type Palette } from './palette';
import type { PartnerTheme } from './partners';
import { formatPricePLN, priceForFormatPLN } from './pricing';

/** TTL of the presigned PDF link in the book-ready e-mail (see convex/email.ts). */
export const DOWNLOAD_LINK_TTL_HOURS = 24;

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Display name for the sender; the address always comes from EMAIL_FROM. */
  fromName?: string;
  replyTo?: string;
}

let resendInstance: Resend | null = null;
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendInstance) resendInstance = new Resend(apiKey);
  return resendInstance;
}

/** `Name <addr>` or bare `addr` → `addr`. */
function senderAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim();
}

function formatFrom(name: string | undefined, fromEnv: string): string {
  if (!name) return fromEnv;
  const quoted = name.replace(/["\\]/g, '');
  return `"${quoted}" <${senderAddress(fromEnv)}>`;
}

export async function sendEmail(params: SendEmailParams): Promise<{ ok: boolean; error?: string }> {
  const client = getResend();
  if (!client) {
    console.warn('[email] RESEND_API_KEY missing — skipping send to', params.to);
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const fromEnv = process.env.EMAIL_FROM;
  if (!fromEnv) {
    console.warn('[email] EMAIL_FROM missing — skipping send to', params.to);
    return { ok: false, error: 'EMAIL_FROM not configured' };
  }
  const replyTo = params.replyTo ?? process.env.EMAIL_REPLY_TO ?? undefined;
  try {
    const { data, error } = await client.emails.send({
      from: formatFrom(params.fromName, fromEnv),
      to: params.to,
      ...(replyTo ? { replyTo } : {}),
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
  return orderId.slice(-12).toUpperCase();
}

function formatLabel(format: BookFormat): string {
  return format === 'pdf_print' ? 'PDF + Druk' : 'PDF';
}

// ── Partner branding ────────────────────────────────────────

export interface EmailBrand {
  name: string;
  /** Absolute URL of a raster logo, or null to render the name as text. */
  logoUrl: string | null;
  supportEmail: string | null;
  primary: Palette;
  accent: Palette;
  /** Text colour that reads on the accent (CTA) colour. */
  onAccent: string;
}

/**
 * Resolve a partner theme into what the templates need. SVG logos fall back
 * to the text wordmark — Gmail and Outlook don't render SVG images.
 */
export function emailBrand(partner: PartnerTheme, appUrl: string): EmailBrand {
  let logoUrl: string | null = null;
  if (partner.logoUrl && !/\.svg(\?|#|$)/i.test(partner.logoUrl)) {
    logoUrl = /^https?:\/\//.test(partner.logoUrl)
      ? partner.logoUrl
      : `${appUrl.replace(/\/+$/, '')}${partner.logoUrl}`;
  }
  return {
    name: partner.name,
    logoUrl,
    supportEmail: partner.supportEmail ?? null,
    primary: paletteFromHex(partner.colors.primary),
    accent: paletteFromHex(partner.colors.accent),
    onAccent: textColorOn(partner.colors.accent),
  };
}

function wordmarkHtml(brand: EmailBrand): string {
  if (brand.logoUrl) {
    return `<img src="${escapeAttr(brand.logoUrl)}" alt="${escapeAttr(brand.name)}" height="44" style="height:44px;width:auto;border:0;display:inline-block;">`;
  }
  return `<div style="color:${brand.primary[800]};font-weight:800;font-size:22px;">${escapeHtml(brand.name)}</div>`;
}

/** Common shell: header with the partner's wordmark, body, footer. */
function renderShell({
  brand,
  preheader,
  body,
  footerNote,
}: {
  brand: EmailBrand;
  preheader: string;
  body: string;
  footerNote: string;
}): string {
  const supportLine = brand.supportEmail
    ? `<div><a href="mailto:${escapeAttr(brand.supportEmail)}" style="color:${brand.primary[600]};text-decoration:none;">${escapeHtml(brand.supportEmail)}</a></div>`
    : '';
  return `<!doctype html>
<html lang="pl" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  </head>
  <body style="margin:0;padding:0;background:#F5F7FA;font-family:Nunito,Arial,sans-serif;color:#334155;">
    <span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;color:#F5F7FA;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px -8px rgba(15,23,42,0.12);overflow:hidden;">
          <tr><td style="background:${brand.primary[50]};padding:28px 24px;text-align:center;border-bottom:1px solid ${brand.primary[100]};">
            ${wordmarkHtml(brand)}
          </td></tr>
${body}
          <tr><td style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
            <div style="margin-bottom:8px;"><strong style="color:${brand.primary[900]};">${escapeHtml(brand.name)}</strong></div>
            ${supportLine}
            <div style="margin-top:12px;max-width:400px;margin-left:auto;margin-right:auto;">${escapeHtml(footerNote)}</div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/**
 * Bullet-proof email CTA. Outlook Desktop on Windows uses the Word render
 * engine and silently drops CSS backgrounds on `<a>` elements, so the button
 * "disappears". We wrap a VML `<v:roundrect>` in an mso-only conditional
 * comment which Outlook honors, and gate the real `<a>` tag behind
 * `[if !mso]` so Outlook never sees both at once.
 *
 * Reference: https://buttons.cm — same pattern Litmus / Email on Acid push.
 */
function buildCtaButton({
  href,
  label,
  brand,
}: {
  href: string;
  label: string;
  brand: EmailBrand;
}): string {
  const hrefAttr = escapeAttr(href);
  const labelHtml = escapeHtml(label);
  const fill = brand.accent[500];
  const gradient = `linear-gradient(135deg,${brand.accent[400]} 0%,${brand.accent[600]} 100%)`;
  return `
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${hrefAttr}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" stroke="f" fillcolor="${fill}">
                <w:anchorlock/>
                <center style="color:${brand.onAccent};font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">${labelHtml}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${hrefAttr}" style="display:inline-block;background-color:${fill};background-image:${gradient};color:${brand.onAccent};font-family:Nunito,Arial,sans-serif;font-weight:800;font-size:17px;line-height:20px;padding:16px 36px;border-radius:999px;text-decoration:none;mso-hide:all;">
                ${labelHtml}
              </a>
              <!--<![endif]-->`;
}

function signOffHtml(brand: EmailBrand): string {
  return `
            <p style="margin:16px 0 0 0;">
              Pozdrawiamy ciepło,<br>
              <strong style="color:${brand.primary[900]};">Zespół ${escapeHtml(brand.name)}</strong>
            </p>`;
}

function contactLineHtml(brand: EmailBrand): string {
  if (!brand.supportEmail) return '';
  return `
            <p style="margin:16px 0 0 0;">
              Coś nie gra? Odpisz na tę wiadomość albo napisz na <a href="mailto:${escapeAttr(brand.supportEmail)}" style="color:${brand.primary[600]};">${escapeHtml(brand.supportEmail)}</a>.
            </p>`;
}

function printNoticeHtml(brand: EmailBrand): string {
  return `
            <div style="background:${brand.accent[50]};border:1px solid ${brand.accent[200]};border-radius:12px;padding:16px 18px;margin:24px 0;font-size:14px;color:${brand.accent[900]};">
              <strong>📦 Drukowana wersja w drodze!</strong> Książeczkę wyślemy kurierem do 10 dni roboczych na wskazany adres.
            </div>`;
}

/** "49 zł", "12,50 zł", "10 EUR" — the charged amount, or the list price if unknown. */
export function formatPaid(
  amountMinor: number | null,
  currency: string | null,
  fallbackPLN: number,
): string {
  if (amountMinor == null) return formatPricePLN(fallbackPLN);
  const major = amountMinor / 100;
  const value = Number.isInteger(major) ? String(major) : major.toFixed(2).replace('.', ',');
  const cur = (currency ?? 'pln').toLowerCase();
  return cur === 'pln' ? `${value} zł` : `${value} ${cur.toUpperCase()}`;
}

// ────────────────────────────────────────────────────────────────
// Email 1 — Payment confirmation, sent after the Stripe webhook flips
// paymentStatus to 'completed'. The PDF usually already exists (pipeline
// runs pre-payment), so this is a thank-you with the link to the order page.
// ────────────────────────────────────────────────────────────────

export interface OrderConfirmationParams {
  brand: EmailBrand;
  childName: string;
  childAge: number | string | null;
  topicTitle: string;
  format: BookFormat;
  orderNumber: string;
  /** Minor units actually charged, when the webhook reported it. */
  paidAmountMinor: number | null;
  paidCurrency: string | null;
  /** True for Stripe test-mode payments — nothing was charged. */
  testPayment: boolean;
  /** Order page where the parent can download the PDF again. */
  resultUrl: string;
}

export function buildOrderConfirmationEmail(params: OrderConfirmationParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { brand, childName, childAge, topicTitle, format, orderNumber, resultUrl } = params;
  const childNameEsc = escapeHtml(childName);
  const ageDisplay = childAge != null && childAge !== '' ? String(childAge) : '—';
  const formatStr = formatLabel(format);
  const paid = formatPaid(params.paidAmountMinor, params.paidCurrency, priceForFormatPLN(format));
  const paidNote = params.testPayment ? ' (płatność testowa)' : '';
  const dlaPhrase = dlaName(childName) ?? `dla ${childName}`;
  const dlaPhraseEsc = escapeHtml(dlaPhrase);
  const labelStyle = `padding:4px 0;color:#64748b;`;
  const valueStyle = `text-align:right;font-weight:700;color:${brand.primary[900]};`;

  const subject = `Dziękujemy za zakup ✨ — bajka ${dlaPhrase} jest Twoja`;
  const preheader = `Płatność potwierdzona. Numer zamówienia ${orderNumber}.`;

  const body = `
          <tr><td style="padding:36px 28px;font-size:16px;line-height:1.65;color:#334155;">
            <h1 style="font-size:28px;font-weight:900;color:${brand.primary[900]};margin:0 0 20px 0;line-height:1.2;">Dziękujemy!</h1>

            <p style="margin:0 0 16px 0;">
              Płatność za bajkę <strong>${dlaPhraseEsc}</strong> przeszła. Pełną wersję PDF znajdziesz pod przyciskiem niżej — strona zamówienia zawsze na Ciebie czeka.
            </p>

            <div style="background:${brand.primary[50]};border:1px solid ${brand.primary[200]};border-radius:16px;padding:20px;margin:24px 0;">
              <div style="font-size:12px;font-weight:800;color:${brand.primary[600]};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;">Potwierdzenie zakupu</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;">
                <tr><td style="${labelStyle}">Numer zamówienia</td><td style="${valueStyle}">${escapeHtml(orderNumber)}</td></tr>
                <tr><td style="${labelStyle}">Bohater bajki</td><td style="${valueStyle}">${childNameEsc}, lat ${escapeHtml(ageDisplay)}</td></tr>
                <tr><td style="${labelStyle}">Temat</td><td style="${valueStyle}">${escapeHtml(topicTitle)}</td></tr>
                <tr><td style="${labelStyle}">Format</td><td style="${valueStyle}">${escapeHtml(formatStr)}</td></tr>
                <tr><td style="${labelStyle}">Zapłacono</td><td style="text-align:right;font-weight:800;color:#16a34a;font-size:17px;">${escapeHtml(paid + paidNote)} ✓</td></tr>
              </table>
            </div>

            <div style="text-align:center;margin:28px 0;">${buildCtaButton({
              href: resultUrl,
              label: '⬇ Pobierz bajkę (PDF)',
              brand,
            })}
              <div style="margin-top:14px;font-size:13px;color:#64748b;">Otwórz w przeglądarce i kliknij „Pobierz PDF".</div>
            </div>${format === 'pdf_print' ? printNoticeHtml(brand) : ''}

            <p style="margin:24px 0 0 0;">
              Czytajcie razem, w spokoju, najlepiej wieczorem. Na końcu książki znajdziecie pytania do rozmowy z dzieckiem — sprawdzają się świetnie po pierwszej lekturze.
            </p>
${contactLineHtml(brand)}
${signOffHtml(brand)}
          </td></tr>`;

  const html = renderShell({
    brand,
    preheader,
    body,
    footerNote:
      'Otrzymujesz tę wiadomość, ponieważ złożyłeś zamówienie. To wiadomość transakcyjna — nie wymaga rezygnacji.',
  });

  const text = [
    'Dziękujemy!',
    '',
    `Płatność za bajkę ${dlaPhrase} przeszła. Pełną wersję PDF pobierzesz ze strony zamówienia:`,
    '',
    resultUrl,
    '',
    'POTWIERDZENIE ZAKUPU',
    `- Numer zamówienia: ${orderNumber}`,
    `- Bohater bajki: ${childName}, lat ${ageDisplay}`,
    `- Temat: ${topicTitle}`,
    `- Format: ${formatStr}`,
    `- Zapłacono: ${paid}${paidNote}`,
    ...(format === 'pdf_print'
      ? ['', 'DRUKOWANA WERSJA: wyślemy ją kurierem do 10 dni roboczych.']
      : []),
    '',
    'Czytajcie razem, w spokoju. Na końcu książki są pytania do rozmowy z dzieckiem.',
    ...(brand.supportEmail ? ['', `Pytania? Napisz na ${brand.supportEmail}.`] : []),
    '',
    'Pozdrawiamy ciepło,',
    `Zespół ${brand.name}`,
  ].join('\n');

  return { subject, html, text };
}

// ────────────────────────────────────────────────────────────────
// Email 2 — Book ready, link to download (no attachment).
// ────────────────────────────────────────────────────────────────

export interface BookReadyParams {
  brand: EmailBrand;
  childName: string;
  bookTitle: string | null;
  downloadUrl: string;
  resultUrl: string;
  format: BookFormat;
}

export function buildBookReadyEmail(params: BookReadyParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { brand, childName, bookTitle, downloadUrl, resultUrl, format } = params;
  // Polish "dla X" needs the genitive form of the name. Helper returns the
  // full "dla {Genitive}" phrase or null when the heuristic can't produce one.
  const dlaPhrase = dlaName(childName) ?? `dla ${childName}`;
  const dlaPhraseEsc = escapeHtml(dlaPhrase);
  const titleStr = bookTitle?.trim() || null;
  const titleEsc = titleStr ? escapeHtml(titleStr) : null;

  const subject = `📖 Bajka ${dlaPhrase} czeka na pobranie`;
  const preheader = 'Kliknij i pobierz PDF z gotową książeczką.';

  const titleClause = titleEsc
    ? `Bajka <em>„${titleEsc}"</em> jest gotowa.`
    : `Spersonalizowana bajka ${dlaPhraseEsc} jest gotowa.`;
  const tipBox = (heading: string, body: string, last = false) =>
    `<div style="background:${brand.primary[50]};border-radius:12px;padding:16px 18px;${last ? '' : 'margin-bottom:10px;'}"><strong style="color:${brand.primary[900]};">${heading}</strong> <span style="color:#475569;">${body}</span></div>`;

  const body = `
          <tr><td style="background:linear-gradient(135deg,${brand.accent[50]} 0%,${brand.accent[100]} 100%);padding:36px 28px;text-align:center;">
            <div style="font-size:56px;line-height:1;margin-bottom:14px;">📖✨</div>
            <h1 style="font-size:30px;font-weight:900;color:${brand.primary[900]};margin:0 0 8px 0;line-height:1.2;">Twoja bajka jest gotowa!</h1>
            <p style="font-size:17px;color:${brand.primary[800]};margin:0;font-weight:600;">Książeczka ${dlaPhraseEsc} czeka pod jednym kliknięciem.</p>
          </td></tr>

          <tr><td style="padding:36px 28px;font-size:16px;line-height:1.65;color:#334155;">
            <p style="margin:0 0 16px 0;">Cześć!</p>
            <p style="margin:0 0 24px 0;">${titleClause} Plik PDF czeka pod poniższym przyciskiem — pobierzcie go na komputer, telefon albo wydrukujcie w domu.</p>

            <div style="text-align:center;margin:28px 0;">${buildCtaButton({
              href: downloadUrl,
              label: '⬇ Pobierz bajkę (PDF)',
              brand,
            })}
            </div>

            <p style="margin:18px 0;font-size:13px;color:#64748b;">
              Link do pliku działa przez ${DOWNLOAD_LINK_TTL_HOURS} godziny. Później pobierzesz bajkę ze <a href="${escapeAttr(resultUrl)}" style="color:${brand.primary[600]};">strony zamówienia</a> — ta działa zawsze.
            </p>

            <h2 style="font-size:18px;font-weight:800;color:${brand.primary[900]};margin:28px 0 12px 0;">💡 Zanim zaczniecie czytać</h2>
            <div style="margin:16px 0;">
              ${tipBox('Czytajcie razem, w spokoju.', 'Najlepiej wieczorem, bez pośpiechu, bez telefonów.')}
              ${tipBox('Pytajcie o emocje.', '„Co czuł bohater?", „Co mu pomogło?" — takie pytania pogłębiają efekt bajki.')}
              ${tipBox('Wracajcie do bajki.', 'Im częściej, tym lepiej. Na końcu książki znajdziesz pytania do rozmowy.', true)}
            </div>
${format === 'pdf_print' ? printNoticeHtml(brand) : ''}
${contactLineHtml(brand)}
${signOffHtml(brand)}
          </td></tr>`;

  const html = renderShell({
    brand,
    preheader,
    body,
    footerNote: 'Bajka ma charakter psychoedukacyjny i nie zastępuje konsultacji ze specjalistą.',
  });

  const titleLine = titleStr
    ? `Bajka „${titleStr}" jest gotowa.`
    : `Spersonalizowana bajka ${dlaPhrase} jest gotowa.`;
  const text = [
    'Cześć!',
    '',
    `${titleLine} Plik PDF pobierzesz spod tego linku (działa ${DOWNLOAD_LINK_TTL_HOURS} godziny):`,
    '',
    downloadUrl,
    '',
    `Później pobierzesz bajkę ze strony zamówienia: ${resultUrl}`,
    '',
    'ZANIM ZACZNIECIE CZYTAĆ',
    '- Czytajcie razem, wieczorem, bez pośpiechu.',
    '- Pytajcie o emocje: „Co czuł bohater?", „Co mu pomogło?".',
    '- Wracajcie do bajki. Na końcu książki znajdziecie pytania do rozmowy.',
    ...(format === 'pdf_print'
      ? ['', 'DRUKOWANA WERSJA: wyślemy ją kurierem do 10 dni roboczych.']
      : []),
    ...(brand.supportEmail ? ['', `Pytania? Napisz na ${brand.supportEmail}.`] : []),
    '',
    'Pozdrawiamy ciepło,',
    `Zespół ${brand.name}`,
  ].join('\n');

  return { subject, html, text };
}

// ────────────────────────────────────────────────────────────────
// Email 3 — Internal alert: a customer paid for PDF + print. Goes to
// ADMIN_ALERT_EMAIL so whoever fulfils print orders can ship the book.
// Not customer-facing, so plain styling and no partner theme.
// ────────────────────────────────────────────────────────────────

export interface AdminPrintAlertParams {
  orderId: string;
  orderNumber: string;
  partnerName: string;
  testPayment: boolean;
  childName: string;
  topicTitle: string;
  customerEmail: string | null;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    zip: string;
    city: string;
  } | null;
}

export function buildAdminPrintAlertEmail(params: AdminPrintAlertParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { orderId, orderNumber, partnerName, testPayment, childName, topicTitle, customerEmail } =
    params;
  const { shippingAddress } = params;
  const testTag = testPayment ? '[TEST — nie drukować] ' : '';
  const subject = `${testTag}📦 Druk — zamówienie ${orderNumber} (${childName}, ${partnerName})`;
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 0;color:#64748b;width:140px;">${escapeHtml(label)}</td><td style="font-weight:700;color:#0f172a;">${value}</td></tr>`;

  const addressRows = shippingAddress
    ? [
        row('Imię i nazwisko', escapeHtml(shippingAddress.fullName)),
        row('Telefon', escapeHtml(shippingAddress.phone)),
        row('Ulica', escapeHtml(shippingAddress.street)),
        row(
          'Kod / miasto',
          `${escapeHtml(shippingAddress.zip)} ${escapeHtml(shippingAddress.city)}`,
        ),
      ].join('')
    : `<tr><td colspan="2" style="padding:8px 0;color:#dc2626;font-weight:700;">⚠️ Brak adresu wysyłki — sprawdź zamówienie w Convex.</td></tr>`;

  const testBanner = testPayment
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:0 0 20px 0;color:#991b1b;font-weight:700;">Płatność testowa (Stripe test mode) — to zamówienie demo, niczego nie drukujemy.</div>`
    : '';

  const html = `<!doctype html>
<html lang="pl">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:24px;background:#F5F7FA;font-family:Arial,sans-serif;color:#334155;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;margin:0 auto;">
      <tr><td style="padding:28px;font-size:15px;line-height:1.6;">
        <h1 style="font-size:22px;margin:0 0 16px 0;color:#0f172a;">📦 Druk + wysyłka</h1>
        ${testBanner}
        <p style="margin:0 0 20px 0;">Opłacono bajkę dla <strong>${escapeHtml(childName)}</strong> w wariancie <strong>PDF + Druk</strong>. PDF poszedł do klienta automatycznie — trzeba wydrukować i wysłać książeczkę.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:20px;">
          ${row('Numer', escapeHtml(orderNumber))}
          ${row('Partner', escapeHtml(partnerName))}
          ${row('Temat', escapeHtml(topicTitle))}
          ${row('Kontakt', customerEmail ? `<a href="mailto:${escapeAttr(customerEmail)}">${escapeHtml(customerEmail)}</a>` : '<span style="color:#dc2626;">brak</span>')}
        </table>
        <h2 style="font-size:16px;margin:0 0 8px 0;color:#0f172a;">Adres wysyłki</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
          ${addressRows}
        </table>
        <p style="margin:24px 0 0 0;font-size:13px;color:#64748b;">PDF do druku: <code>npm run cli -- download ${escapeHtml(orderId)}</code> (szczegóły: <code>npm run cli -- detail ${escapeHtml(orderId)}</code>).</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const addressText = shippingAddress
    ? [
        `Imię i nazwisko: ${shippingAddress.fullName}`,
        `Telefon: ${shippingAddress.phone}`,
        `Ulica: ${shippingAddress.street}`,
        `Kod / miasto: ${shippingAddress.zip} ${shippingAddress.city}`,
      ].join('\n')
    : '⚠️ BRAK ADRESU WYSYŁKI — sprawdź zamówienie w Convex.';

  const text = [
    `${testTag}ZAMÓWIENIE PDF + DRUK`,
    '',
    ...(testPayment ? ['Płatność testowa — zamówienie demo, niczego nie drukujemy.', ''] : []),
    `Opłacono bajkę dla ${childName} w wariancie PDF + Druk.`,
    '',
    `- Numer: ${orderNumber}`,
    `- Partner: ${partnerName}`,
    `- Temat: ${topicTitle}`,
    `- Kontakt: ${customerEmail ?? 'brak'}`,
    '',
    'ADRES WYSYŁKI',
    addressText,
    '',
    `PDF do druku: npm run cli -- download ${orderId}`,
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
