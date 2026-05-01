/**
 * A9 — PDF composer via external typst-render service.
 *
 * V8 runtime (NO 'use node') — żeby uniknąć kosztu Node action minutes.
 * Cała robota się dzieje na VPS:
 *   - VPS pobiera ilustracje przez Convex signed URLs (ctx.storage.getUrl)
 *   - VPS kompiluje Typst template
 *   - VPS uploaduje PDFy na Cloudflare R2
 *   - tutaj zapisujemy r2FullKey/r2PreviewKey w bookOrders
 *
 * Triggered przez bookAgents.composePdf gdy USE_RENDER_SERVICE=true.
 */
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { buildRenderBrief, type RenderBrief } from './lib/buildRenderBrief';
import { getNarrative } from './bookPipelineEvents';

const RENDER_TIMEOUT_MS = 120_000;

interface RenderResponse {
  jobId: string;
  outputKey: string;
  sizeBytes: number;
  pages: number;
  durationMs: number;
  cached: boolean;
}

export const generatePdfViaRender = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }): Promise<null> => {
    const log = (msg: string, data?: Record<string, unknown>) => {
      console.log(`[A9:render] ${msg}`, data ? JSON.stringify(data) : '');
    };

    const renderUrl = process.env.RENDER_SERVICE_URL;
    const renderSecret = process.env.RENDER_SHARED_SECRET;
    if (!renderUrl || !renderSecret) {
      throw new Error('RENDER_SERVICE_URL or RENDER_SHARED_SECRET missing in Convex env');
    }

    try {
      log('start', { orderId });

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order?.storyDraft) throw new Error('order.storyDraft missing');

      const illustrations = await ctx.runQuery(internal.bookPipelineHelpers.getIllustrations, {
        orderId,
      });

      // Generate signed URLs for all illustrations (~10 min TTL).
      const briefIllustrations = await Promise.all(
        illustrations.map(async (i) => {
          const url = await ctx.storage.getUrl(i.storageId);
          if (!url) throw new Error(`Illustration ${i.illustrationId} has no URL`);
          return { illustrationId: i.illustrationId, url };
        }),
      );

      const fullBrief = buildRenderBrief({
        jobId: orderId as unknown as string,
        mode: 'full',
        order,
        illustrations: briefIllustrations,
        outputKey: `orders/${orderId}/full.pdf`,
      });
      const previewBrief = buildRenderBrief({
        jobId: orderId as unknown as string,
        mode: 'preview',
        order,
        illustrations: briefIllustrations,
        outputKey: `orders/${orderId}/preview.pdf`,
        maxPages: 3,
      });

      log('briefs built', {
        full: fullBrief.pages.length,
        preview: previewBrief.maxPages,
        bracket: fullBrief.bracket,
      });

      // Render both — sequential żeby nie zalać single VPS przy bursts.
      const fullResult = await callRender(renderUrl, renderSecret, fullBrief);
      log('full rendered', {
        sizeKb: Math.round(fullResult.sizeBytes / 1024),
        durationMs: fullResult.durationMs,
        cached: fullResult.cached,
      });

      const previewResult = await callRender(renderUrl, renderSecret, previewBrief);
      log('preview rendered', {
        sizeKb: Math.round(previewResult.sizeBytes / 1024),
        durationMs: previewResult.durationMs,
        cached: previewResult.cached,
      });

      await ctx.runMutation(internal.bookPipelineHelpers.updateR2Keys, {
        orderId,
        r2FullKey: fullResult.outputKey,
        r2PreviewKey: previewResult.outputKey,
      });

      await ctx.runMutation(internal.bookPipelineEvents.recordEvent, {
        orderId,
        agent: 'A9',
        event: 'complete',
        narrative: getNarrative('A9', 'complete'),
      });

      await ctx.scheduler.runAfter(0, internal.bookAgents.reviewFinal, { orderId });
      log('done, A10 scheduled');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[A9:render] FAILED:', errMsg);
      await ctx.runMutation(internal.bookPipelineEvents.recordEvent, {
        orderId,
        agent: 'A9',
        event: 'error',
        narrative: getNarrative('A9', 'error', errMsg),
        details: errMsg,
      });
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A9',
        error: errMsg,
      });
    }
    return null;
  },
});

async function callRender(
  baseUrl: string,
  secret: string,
  brief: RenderBrief,
): Promise<RenderResponse> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), RENDER_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/render`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(brief),
      signal: ac.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`render ${res.status}: ${txt.slice(0, 500)}`);
    }
    return (await res.json()) as RenderResponse;
  } finally {
    clearTimeout(timer);
  }
}
