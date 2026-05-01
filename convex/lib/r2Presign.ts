/**
 * R2 presigned URL helper — V8-compatible (no 'use node').
 *
 * AWS Signature V4 for S3 GET, hand-rolled — purposefully avoids @aws-sdk/*
 * because those packages don't run in Convex V8 runtime. Uses Web Crypto
 * which IS available in V8.
 *
 * Spec: https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
 */

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string; // np. https://<account>.r2.cloudflarestorage.com
}

function readR2ConfigFromEnv(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const endpoint = process.env.R2_ENDPOINT;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !endpoint) {
    throw new Error(
      'R2 env not configured: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT',
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint };
}

const ENC = new TextEncoder();
const HEX = '0123456789abcdef';

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const view = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < view.length; i++) {
    const b = view[i]!;
    out += HEX[b >>> 4]! + HEX[b & 0xf]!;
  }
  return out;
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', ENC.encode(s));
  return toHex(buf);
}

async function hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<Uint8Array> {
  // Wymuszamy ArrayBuffer view (nie SharedArrayBuffer) — TS w Node 22 jest tu pikselowy.
  const keyBuf =
    key instanceof Uint8Array
      ? key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength)
      : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuf as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, ENC.encode(msg));
  return new Uint8Array(sig);
}

async function deriveSigningKey(
  secret: string,
  date: string,
  region: string,
  service: string,
): Promise<Uint8Array> {
  const kDate = await hmac(ENC.encode('AWS4' + secret), date);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');
  return kSigning;
}

function rfc3986(s: string): string {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function encodeKey(key: string): string {
  // Encode each segment, preserve "/" separators (S3 path style).
  return key.split('/').map(rfc3986).join('/');
}

/**
 * Generate a presigned GET URL for an R2 object. Default TTL 15 min.
 */
export async function presignR2GetUrl(key: string, ttlSeconds = 900): Promise<string> {
  const cfg = readR2ConfigFromEnv();
  const region = 'auto';
  const service = 's3';

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // 20260501T101530Z
  const dateStamp = amzDate.slice(0, 8);

  const host = new URL(cfg.endpoint).host;
  const credential = `${cfg.accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`;

  const canonicalUri = `/${cfg.bucket}/${encodeKey(key)}`;

  const params = new URLSearchParams();
  params.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
  params.set('X-Amz-Credential', credential);
  params.set('X-Amz-Date', amzDate);
  params.set('X-Amz-Expires', String(ttlSeconds));
  params.set('X-Amz-SignedHeaders', 'host');

  // URLSearchParams sorts; AWS canonical query string is also sorted.
  // But URLSearchParams uses '+' for space — we replace below.
  const sortedKeys = Array.from(params.keys()).sort();
  const canonicalQuery = sortedKeys
    .map((k) => `${rfc3986(k)}=${rfc3986(params.get(k)!)}`)
    .join('&');

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';

  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    `${dateStamp}/${region}/${service}/aws4_request`,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = await deriveSigningKey(cfg.secretAccessKey, dateStamp, region, service);
  const signature = toHex(await hmac(signingKey, stringToSign));

  return `${cfg.endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
