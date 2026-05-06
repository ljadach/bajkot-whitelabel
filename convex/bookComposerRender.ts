/**
 * A9 — PDF composer via external typst-render service.
 * V8 runtime; no 'use node' to avoid Node action minute cost.
 */
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { buildRenderBrief, type RenderBrief } from './lib/buildRenderBrief';
import { r2OutputKeyFor, type R2Kind } from './lib/r2Presign';
import { getNarrative } from './bookPipelineEvents';

const RENDER_TIMEOUT_MS = 120_000;
const PREVIEW_PAGE_COUNT = 3;

interface RenderResponse {
  jobId: string;
  outputKey: string;
  sizeBytes: number;
  pages: number;
  durationMs: number;
  cached: boolean;
}

export const generatePdfViaRender = internalAction({
  args: {
    orderId: v.id('bookOrders'),
    /** Bypass typst-render's R2 cache — useful for DTP iteration. */
    force: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, { orderId, force }): Promise<null> => {
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

      const briefIllustrations = await Promise.all(
        illustrations.map(async (i) => {
          const url = await ctx.storage.getUrl(i.storageId);
          if (!url) throw new Error(`Illustration ${i.illustrationId} has no URL`);
          return { illustrationId: i.illustrationId, url };
        }),
      );

      const jobId = String(orderId);
      const briefFor = (kind: R2Kind): RenderBrief =>
        buildRenderBrief({
          jobId,
          mode: kind,
          order,
          illustrations: briefIllustrations,
          outputKey: r2OutputKeyFor(orderId, kind),
          maxPages: kind === 'preview' ? PREVIEW_PAGE_COUNT : undefined,
          force,
        });

      const fullBrief = briefFor('full');
      const previewBrief = briefFor('preview');

      log('briefs built', { full: fullBrief.pages.length, bracket: fullBrief.bracket });

      // p-limit(5) on the render service bounds bursts; 2 parallel calls fit fine.
      const [fullResult, previewResult] = await Promise.all([
        callRender(renderUrl, renderSecret, fullBrief),
        callRender(renderUrl, renderSecret, previewBrief),
      ]);

      log('rendered', {
        fullKb: Math.round(fullResult.sizeBytes / 1024),
        previewKb: Math.round(previewResult.sizeBytes / 1024),
        fullMs: fullResult.durationMs,
        previewMs: previewResult.durationMs,
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
