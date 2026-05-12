/**
 * R2 presigned URL helper — V8-compatible (no 'use node').
 *
 * Uses aws4fetch (Web Crypto under the hood) because @aws-sdk/* depends on
 * node:stream/http/https/url which Convex V8 strips at bundle time.
 */
import { AwsClient } from 'aws4fetch';
import type { Doc, Id } from '../_generated/dataModel';

interface R2Config {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
}

function readR2ConfigFromEnv(): R2Config {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const endpoint = process.env.R2_ENDPOINT;
  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) {
    throw new Error(
      'R2 env not configured: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT',
    );
  }
  return { accessKeyId, secretAccessKey, bucket, endpoint };
}

const DEFAULT_TTL_SECONDS = 900;

let cachedClient: { config: R2Config; client: AwsClient } | null = null;

function getClient(): { config: R2Config; client: AwsClient } {
  if (cachedClient) return cachedClient;
  const config = readR2ConfigFromEnv();
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: 's3',
    region: 'auto',
  });
  cachedClient = { config, client };
  return cachedClient;
}

/** Generate a presigned GET URL for an R2 object. */
export async function presignR2GetUrl(
  key: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  filename?: string,
): Promise<string> {
  const { config, client } = getClient();
  const params: string[] = [`X-Amz-Expires=${ttlSeconds}`];
  if (filename) {
    const disposition = `attachment; filename="${filename}"`;
    params.push(`response-content-disposition=${encodeURIComponent(disposition)}`);
  }
  const url = `${config.endpoint.replace(/\/$/, '')}/${config.bucket}/${encodeKey(key)}?${params.join('&')}`;
  const signed = await client.sign(url, { method: 'GET', aws: { signQuery: true } });
  return signed.url;
}

/** Pick the R2 key for a given output kind. */
export type R2Kind = 'full' | 'preview';

export function r2KeyFor(order: Doc<'bookOrders'>, kind: R2Kind): string | undefined {
  return kind === 'preview' ? order.r2PreviewKey : order.r2FullKey;
}

/** Compute the canonical R2 outputKey for an order. Render service writes here, frontend reads from here. */
export function r2OutputKeyFor(orderId: Id<'bookOrders'>, kind: R2Kind): string {
  return `orders/${orderId}/${kind}.pdf`;
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

// ── Filename for downloads ─────────────────────────────────
// Browsers and email clients pick the filename from R2's Content-Disposition
// (set via the signed response-content-disposition param) — without this every
// PDF lands on disk as `full.pdf` because that's the R2 object key.

const POLISH_TRANSLIT: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
  Ą: 'A',
  Ć: 'C',
  Ę: 'E',
  Ł: 'L',
  Ń: 'N',
  Ó: 'O',
  Ś: 'S',
  Ź: 'Z',
  Ż: 'Z',
};

function transliteratePolish(input: string): string {
  return input.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (ch) => POLISH_TRANSLIT[ch] ?? ch);
}

function sanitizeNameForFilename(name: string): string {
  const ascii = transliteratePolish(name)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
  const cleaned = ascii.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned.slice(0, 40);
}

/**
 * Build a human-friendly download name for an order's PDF, e.g.
 * `Bajka_Zosia_ABCD1234EF56.pdf`. Falls back gracefully when the child
 * name is empty or strips to nothing after sanitization.
 */
export function bookPdfFilename(order: Doc<'bookOrders'>, kind: R2Kind = 'full'): string {
  const tail = (order._id as string).slice(-12).toUpperCase();
  const safeName = sanitizeNameForFilename(order.childName ?? '');
  const stem = safeName ? `Bajka_${safeName}_${tail}` : `Bajka_${tail}`;
  return kind === 'preview' ? `${stem}_preview.pdf` : `${stem}.pdf`;
}
