import { randomHex } from './utils';

const baseUrl = process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';
const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
const secretKey = process.env.LANGFUSE_SECRET_KEY;

function toNano(ms: number) {
  return BigInt(ms) * BigInt(1_000_000);
}

function encodeBase64(value: string) {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(value);
  }
  if (typeof globalThis.Buffer !== 'undefined') {
    return globalThis.Buffer.from(value, 'utf8').toString('base64');
  }
  throw new Error('No base64 encoder available in this runtime');
}

function serializeAttribute(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export type ManualTraceOptions = {
  observationType?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string | null;
  serviceName?: string;
  scopeName?: string;
  scopeVersion?: string;
  startTimeMs?: number;
  endTimeMs?: number;
};

export async function sendManualTrace(
  name: string,
  attributes: Record<string, unknown> = {},
  options: ManualTraceOptions = {},
) {
  if (!publicKey || !secretKey) {
    console.warn('[langfuse-rest] missing credentials, skipping trace', {
      hasPublic: Boolean(publicKey),
      hasSecret: Boolean(secretKey),
    });
    return { sent: false };
  }

  const traceId = options.traceId || randomHex(16);
  const spanId = options.spanId || randomHex(8);
  const startMs = options.startTimeMs ?? Date.now();
  const endMs = options.endTimeMs ?? startMs + 200;
  const start = toNano(startMs);
  const end = toNano(endMs);

  const body = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            {
              key: 'service.name',
              value: { stringValue: options.serviceName || 'convex-app' },
            },
          ],
        },
        scopeSpans: [
          {
            scope: {
              name: options.scopeName || 'convex.manual',
              version: options.scopeVersion || '1.0.0',
            },
            spans: [
              {
                traceId,
                spanId,
                parentSpanId: options.parentSpanId || undefined,
                name,
                kind: 1,
                startTimeUnixNano: start.toString(),
                endTimeUnixNano: end.toString(),
                attributes: [
                  {
                    key: 'langfuse.observation.type',
                    value: {
                      stringValue: options.observationType || 'generation',
                    },
                  },
                  ...Object.entries(attributes).map(([key, value]) => ({
                    key: String(key),
                    value: { stringValue: serializeAttribute(value) },
                  })),
                ],
                status: {},
              },
            ],
          },
        ],
      },
    ],
  };

  const auth = encodeBase64(`${publicKey}:${secretKey}`);
  const res = await fetch(`${baseUrl}/api/public/otel/v1/traces`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('[langfuse-rest] trace failed', res.status, text);
    throw new Error(`Langfuse trace failed: ${res.status}: ${text}`);
  }
  return { sent: true, traceId, spanId, response: text };
}
