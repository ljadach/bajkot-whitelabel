// HTTP callback z typst-render po zakończeniu print-ready joba.
// Auth: Bearer PRINT_CALLBACK_SECRET (osobny sekret, NIE RENDER_SHARED_SECRET
// — serwis nie musi znać sekretu, którym bajkot autoryzuje SIEBIE u niego,
// i odwrotnie). Payload: PrintCallback (typst-render src/lib/printSchema.ts).
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

export const receivePrintCallback = httpAction(async (ctx, req) => {
  const secret = process.env.PRINT_CALLBACK_SECRET;
  if (!secret) {
    console.error('print callback: PRINT_CALLBACK_SECRET not configured');
    return new Response('not configured', { status: 503 });
  }
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    return new Response('unauthorized', { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response('bad json', { status: 400 });
  }

  const status = body.status;
  const format = body.format;
  if (
    typeof body.orderId !== 'string' ||
    (status !== 'ready' && status !== 'failed') ||
    (format !== 'a5' && format !== 'a4') ||
    typeof body.outputKey !== 'string' ||
    typeof body.logKey !== 'string'
  ) {
    return new Response('bad payload', { status: 400 });
  }

  const error = (body.error ?? undefined) as { step?: string; message?: string } | undefined;
  await ctx.runMutation(internal.admin.printPdf.applyPrintCallback, {
    orderId: body.orderId as Id<'bookOrders'>,
    format,
    status,
    outputKey: body.outputKey,
    logKey: body.logKey,
    sizeBytes: typeof body.sizeBytes === 'number' ? body.sizeBytes : undefined,
    pages: typeof body.pages === 'number' ? body.pages : undefined,
    pipelineVersion: typeof body.pipelineVersion === 'string' ? body.pipelineVersion : undefined,
    durationMs: typeof body.durationMs === 'number' ? body.durationMs : undefined,
    cached: typeof body.cached === 'boolean' ? body.cached : undefined,
    errorStep: error?.step,
    errorMessage: error?.message,
  });
  return new Response('ok', { status: 200 });
});
