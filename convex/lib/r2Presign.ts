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
): Promise<string> {
  const { config, client } = getClient();
  const url = `${config.endpoint.replace(/\/$/, '')}/${config.bucket}/${encodeKey(key)}?X-Amz-Expires=${ttlSeconds}`;
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
