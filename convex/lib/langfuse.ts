import { sendManualTrace } from './langfuseRest';
import { randomHex } from './utils';

type PropagatedAttributes = {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, string>;
  version?: string;
  tags?: string[];
};

export type ObservationOptions = {
  asType?: 'span' | 'generation' | 'tool' | 'log' | string;
};

export type Observation = {
  update: (data: Record<string, unknown>) => Observation;
  end: () => Promise<void>;
  startObservation: (name: string, attributes?: Record<string, unknown>, options?: ObservationOptions) => Observation;
  context: () => { traceId: string; spanId: string };
};

type ActiveContext = {
  traceId: string;
  spanId: string;
  observation: MinimalObservation;
  propagated: PropagatedAttributes;
};

if (!process.env.LANGFUSE_BASE_URL) {
  process.env.LANGFUSE_BASE_URL = 'https://cloud.langfuse.com';
}

const hasCredentials = Boolean(process.env.LANGFUSE_SECRET_KEY) && Boolean(process.env.LANGFUSE_PUBLIC_KEY);

const serviceName = process.env.LANGFUSE_SERVICE_NAME || 'convex-app';
const scopeName = 'convex.manual';
const langfuseEnabled = hasCredentials;

const contextStack: ActiveContext[] = [];

class MinimalObservation implements Observation {
  private attributes: Record<string, unknown>;
  private readonly startMs: number;
  private ended = false;

  constructor(
    private readonly name: string,
    private readonly type: string,
    initialAttributes: Record<string, unknown>,
    private readonly traceId: string,
    private readonly spanId: string,
    private readonly propagated: PropagatedAttributes,
    private readonly parentSpanId?: string
  ) {
    this.attributes = { ...initialAttributes };
    this.startMs = Date.now();
  }

  update(data: Record<string, unknown>): Observation {
    this.attributes = { ...this.attributes, ...data };
    return this;
  }

  startObservation(name: string, attributes: Record<string, unknown> = {}, options: ObservationOptions = {}): Observation {
    return createObservation({
      name,
      attributes,
      type: options.asType || 'span',
      traceId: this.traceId,
      parentSpanId: this.spanId,
      propagated: this.propagated,
    });
  }

  async end(): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    const endMs = Date.now();
    await flushObservation(this.name, this.attributes, this.type, {
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      propagated: this.propagated,
      startTimeMs: this.startMs,
      endTimeMs: endMs,
    });
  }

  async finish(status: 'success' | 'error', error?: unknown): Promise<void> {
    const payload: Record<string, unknown> = { status };
    if (error instanceof Error) {
      payload.error_message = error.message;
      payload.error_stack = error.stack;
    } else if (error) {
      payload.error = String(error);
    }
    this.update(payload);
    await this.end();
  }

  context() {
    return { traceId: this.traceId, spanId: this.spanId };
  }
}

const dummyObservation: Observation = {
  update: () => dummyObservation,
  end: async () => {},
  startObservation: () => dummyObservation,
  context: () => ({ traceId: '', spanId: '' }),
};

function getCurrentContext(): ActiveContext | null {
  return contextStack.length > 0 ? contextStack[contextStack.length - 1] : null;
}

function createObservation(params: { name: string; attributes?: Record<string, unknown>; type: string; traceId: string; parentSpanId?: string; propagated: PropagatedAttributes; spanId?: string }): MinimalObservation {
  return new MinimalObservation(params.name, params.type, params.attributes || {}, params.traceId, params.spanId || randomHex(8), params.propagated, params.parentSpanId);
}

function formatPropagatedAttributes(propagated: PropagatedAttributes): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (propagated.userId) out.userId = propagated.userId;
  if (propagated.sessionId) out.sessionId = propagated.sessionId;
  if (propagated.version) out.version = propagated.version;
  if (propagated.tags && propagated.tags.length > 0) {
    out.tags = propagated.tags;
  }
  if (propagated.metadata && Object.keys(propagated.metadata).length > 0) {
    out.metadata = propagated.metadata;
  }
  return out;
}

async function flushObservation(
  name: string,
  attributes: Record<string, unknown>,
  type: string,
  options: {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    propagated: PropagatedAttributes;
    startTimeMs: number;
    endTimeMs: number;
  }
) {
  if (!langfuseEnabled) return;
  const payload = {
    ...formatPropagatedAttributes(options.propagated),
    ...attributes,
  };
  await sendManualTrace(name, payload, {
    observationType: type,
    traceId: options.traceId,
    spanId: options.spanId,
    parentSpanId: options.parentSpanId,
    serviceName,
    scopeName,
    startTimeMs: options.startTimeMs,
    endTimeMs: options.endTimeMs,
  });
}

function mergePropagated(target: PropagatedAttributes, patch: PropagatedAttributes) {
  if (patch.userId) target.userId = patch.userId;
  if (patch.sessionId) target.sessionId = patch.sessionId;
  if (patch.version) target.version = patch.version;
  if (patch.metadata) {
    target.metadata = { ...(target.metadata || {}), ...patch.metadata };
  }
  if (patch.tags) {
    const set = new Set([...(target.tags || []), ...patch.tags]);
    target.tags = Array.from(set);
  }
}

function clonePropagated(source: PropagatedAttributes): PropagatedAttributes {
  return {
    userId: source.userId,
    sessionId: source.sessionId,
    version: source.version,
    metadata: source.metadata ? { ...source.metadata } : undefined,
    tags: source.tags ? [...source.tags] : undefined,
  };
}

function restorePropagated(target: PropagatedAttributes, snapshot: PropagatedAttributes) {
  target.userId = snapshot.userId;
  target.sessionId = snapshot.sessionId;
  target.version = snapshot.version;
  target.metadata = snapshot.metadata ? { ...snapshot.metadata } : undefined;
  target.tags = snapshot.tags ? [...snapshot.tags] : undefined;
}

export function isLangfuseEnabled(): boolean {
  return langfuseEnabled;
}

export async function startActiveObservation<T>(name: string, handler: (span: Observation) => Promise<T>, options: ObservationOptions = {}): Promise<T> {
  if (!langfuseEnabled) {
    return await handler(dummyObservation);
  }
  const parent = getCurrentContext();
  const traceId = parent?.traceId ?? randomHex(16);
  const parentSpanId = parent?.spanId;
  const propagated = parent ? { ...parent.propagated } : {};
  const spanId = randomHex(8);
  const observation = createObservation({
    name,
    attributes: {},
    type: options.asType || 'span',
    traceId,
    spanId,
    parentSpanId,
    propagated,
  });
  const entry: ActiveContext = {
    traceId,
    spanId,
    observation,
    propagated,
  };
  contextStack.push(entry);
  try {
    const result = await handler(observation);
    await observation.finish('success');
    return result;
  } catch (error) {
    await observation.finish('error', error);
    console.info(`[langfuse] span end (error): ${name}`);
    throw error;
  } finally {
    contextStack.pop();
  }
}

export function startObservation(name: string, attributes: Record<string, unknown> = {}, options: ObservationOptions = {}): Observation {
  if (!langfuseEnabled) {
    return dummyObservation;
  }
  const parent = getCurrentContext();
  const traceId = parent?.traceId ?? randomHex(16);
  const parentSpanId = parent?.spanId;
  const propagated = parent ? parent.propagated : {};
  return createObservation({
    name,
    attributes,
    type: options.asType || 'span',
    traceId,
    parentSpanId,
    propagated,
  });
}

export function observe<F extends (...args: any[]) => any>(
  fn: F,
  options: {
    name?: string;
    asType?: ObservationOptions['asType'];
    captureInput?: boolean;
    captureOutput?: boolean;
  } = {}
): (...args: Parameters<F>) => Promise<Awaited<ReturnType<F>>> {
  return async function observed(this: unknown, ...args: Parameters<F>): Promise<Awaited<ReturnType<F>>> {
    const spanName = options.name || fn.name || 'anonymous';
    return startActiveObservation<Awaited<ReturnType<F>>>(
      spanName,
      async (span): Promise<Awaited<ReturnType<F>>> => {
        if (options.captureInput !== false) {
          span.update({ input: args });
        }
        try {
          const result = (await fn.apply(this, args)) as Awaited<ReturnType<F>>;
          if (options.captureOutput !== false) {
            span.update({ output: result });
          }
          return result;
        } catch (error) {
          span.update({
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
      { asType: options.asType || 'span' }
    );
  };
}

export function updateActiveObservation(attributes: Record<string, unknown>): void {
  if (!langfuseEnabled) return;
  const ctx = getCurrentContext();
  ctx?.observation.update(attributes);
}

export async function propagateAttributes<T>(attrs: PropagatedAttributes, handler: () => Promise<T>): Promise<T> {
  if (!langfuseEnabled) {
    return handler();
  }
  const ctx = getCurrentContext();
  if (!ctx) {
    return handler();
  }
  const snapshot = clonePropagated(ctx.propagated);
  mergePropagated(ctx.propagated, attrs);
  try {
    return await handler();
  } finally {
    restorePropagated(ctx.propagated, snapshot);
  }
}

export async function withLangfuseSpan<T>(name: string, attributes: Record<string, unknown>, fn: (span?: Observation) => Promise<T> | T, options: ObservationOptions = {}): Promise<T> {
  if (!langfuseEnabled) {
    return await fn();
  }
  return startActiveObservation(
    name,
    async (span) => {
      span.update(attributes);
      return await fn(span);
    },
    options
  );
}
