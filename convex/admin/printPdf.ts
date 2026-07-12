// Print-ready PDF (plik drukarski CMYK) — admin-only.
//
// Generacja odpala się WYŁĄCZNIE na klik w adminie: action generatePrintPdf
// buduje brief (ta sama rekonstrukcja sekwencji co produkcyjny render —
// buildRenderBrief na danych ordera) i POST-uje do typst-render
// /print-ready. Wynik wraca callbackiem (convex/printPdfHttp.ts) i ląduje
// w R2 pod print/<orderId>/<format>.pdf (lifecycle 30 dni — plik jest
// odtwarzalny przyciskiem, nie archiwizujemy).
//
// Flow kliencki NIETKNIĘTY: printR2Key nie wychodzi przez żadne publiczne
// query, presign tylko za assertAdmin. Kanon pipeline'u i troubleshooting:
// typst-render docs/print-ready-pipeline.md + print-ready-service.md.
import { v } from 'convex/values';
import { action, internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { assertAdmin } from '../lib/roles';
import { presignR2GetUrl, bookPdfFilename } from '../lib/r2Presign';
import { buildRenderBrief } from '../lib/buildRenderBrief';

type BookIllustration = { illustrationId: string; storageId: Id<'_storage'> };

const printFormat = v.union(v.literal('a5'), v.literal('a4'));
type PrintFormat = 'a5' | 'a4';

const SOURCE_URL_TTL_SECONDS = 3600; // serwis pobiera od razu, 1h = zapas na retry

export function printR2KeyFor(orderId: string, format: PrintFormat): string {
  return `print/${orderId}/${format}.pdf`;
}

export const generatePrintPdf = action({
  args: {
    orderId: v.id('bookOrders'),
    format: printFormat,
    force: v.optional(v.boolean()),
  },
  returns: v.object({ jobId: v.string() }),
  handler: async (ctx, { orderId, format, force }): Promise<{ jobId: string }> => {
    await assertAdmin(ctx);

    const renderUrl = process.env.RENDER_SERVICE_URL;
    const renderSecret = process.env.RENDER_SHARED_SECRET;
    if (!renderUrl || !renderSecret) {
      throw new Error('RENDER_SERVICE_URL or RENDER_SHARED_SECRET missing');
    }
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!siteUrl) throw new Error('CONVEX_SITE_URL missing');

    const order: Doc<'bookOrders'> | null = await ctx.runQuery(
      internal.bookPipelineHelpers.getOrder,
      { orderId },
    );
    if (!order) throw new Error('Order not found');
    // Tylko ścieżka typst-render: pipeline print jest walidowany na jej
    // geometrii (A4). Ordery legacy pdfkit (kwadrat 210×210) wymagałyby
    // osobnej kalibracji — celowo niewspierane.
    if (!order.r2FullKey) {
      throw new Error('Order has no r2FullKey — print-ready wspiera tylko ścieżkę typst-render');
    }
    if (!order.storyDraft) throw new Error('Order has no storyDraft');

    if (!force && (order.printPdfStatus === 'queued' || order.printPdfStatus === 'rendering')) {
      throw new Error('Print job już trwa — poczekaj na wynik albo użyj force');
    }

    const illustrations: BookIllustration[] = await ctx.runQuery(
      internal.bookPipelineHelpers.getIllustrations,
      { orderId },
    );
    const briefIllustrations = await Promise.all(
      illustrations.map(async (i: BookIllustration) => {
        const url = await ctx.storage.getUrl(i.storageId);
        if (!url) throw new Error(`Illustration ${i.illustrationId} has no URL`);
        return { illustrationId: i.illustrationId, url };
      }),
    );

    // Ta sama rekonstrukcja sekwencji co produkcyjny render full.pdf
    // (bookComposerRender) — łącznie z experimental, bo od flag zależy
    // układ stron. bgTitleOverride nie zmienia sekwencji, ale trzymamy 1:1.
    const renderBrief = buildRenderBrief({
      jobId: String(orderId),
      mode: 'full',
      order,
      illustrations: briefIllustrations,
      outputKey: order.r2FullKey,
      experimental: { bgTitleOverride: '#FFFFFF' },
    });
    const pages = renderBrief.pages;

    const pagesOf = (kind: string) => pages.filter((p) => p.kind === kind).map((p) => p.pageNumber);
    const single = (kind: string): number => {
      const found = pagesOf(kind);
      if (found.length !== 1) {
        throw new Error(`Sekwencja ma ${found.length} stron kind=${kind}, oczekiwano 1`);
      }
      return found[0];
    };

    const urlByIllustrationId = new Map(
      briefIllustrations.map((i: { illustrationId: string; url: string }) => [
        i.illustrationId,
        i.url,
      ]),
    );
    const printIllustrations = pages
      .filter((p) => p.illustrationId)
      .map((p) => {
        const url = urlByIllustrationId.get(p.illustrationId!);
        if (!url) throw new Error(`Brak URL ilustracji ${p.illustrationId}`);
        return { page: p.pageNumber, url };
      });

    const blanks = pagesOf('blank');
    if (blanks.length === 0) throw new Error('Sekwencja bez strony blank');
    // Folio dostają strony text/illustration/chapter_header — musi się
    // zgadzać z numbered-kind() w typst-render templates/common/layout.typ.
    const numberedPages = pages
      .filter((p) => p.kind === 'text' || p.kind === 'illustration' || p.kind === 'chapter_header')
      .map((p) => p.pageNumber);
    const referenceTextPages = pagesOf('text').slice(0, 2);

    const jobId = `${orderId}-${format}`;
    const outputKey = printR2KeyFor(orderId, format);
    const logKey = `print/${orderId}/${format}.log.txt`;

    const printBrief = {
      jobId,
      orderId: String(orderId),
      sourcePdfUrl: await presignR2GetUrl(order.r2FullKey, SOURCE_URL_TTL_SECONDS),
      illustrations: printIllustrations,
      format,
      totalPages: pages.length,
      parentCardPage: single('parent_card'),
      colophonPage: single('colophon'),
      moodClosingPage: single('mood_closing'),
      blankSourcePage: blanks[0],
      numberedPages,
      referenceTextPages,
      outputKey,
      logKey,
      callbackUrl: `${siteUrl}/print-ready/callback`,
      force: force ?? false,
    };

    await ctx.runMutation(internal.admin.printPdf.setPrintPdfRequested, {
      orderId,
      format,
      outputKey,
      logKey,
    });

    let res: Response;
    try {
      res = await fetch(`${renderUrl}/print-ready`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${renderSecret}`,
        },
        body: JSON.stringify(printBrief),
      });
    } catch (err) {
      await ctx.runMutation(internal.admin.printPdf.markPrintPdfFailed, {
        orderId,
        format,
        error: `POST /print-ready: ${(err as Error).message}`,
      });
      throw err;
    }
    if (res.status === 409) {
      // job już biegnie na serwisie — zostawiamy status queued/rendering
      return { jobId };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const error = `POST /print-ready: HTTP ${res.status} ${body.slice(0, 300)}`;
      await ctx.runMutation(internal.admin.printPdf.markPrintPdfFailed, {
        orderId,
        format,
        error,
      });
      throw new Error(error);
    }
    return { jobId };
  },
});

/** Presigned URL do pobrania pliku drukarskiego (lub logu) — tylko admin. */
export const resolvePrintDownloadUrl = action({
  args: {
    orderId: v.id('bookOrders'),
    kind: v.union(v.literal('pdf'), v.literal('log')),
  },
  returns: v.string(),
  handler: async (ctx, { orderId, kind }): Promise<string> => {
    await assertAdmin(ctx);
    const order: Doc<'bookOrders'> | null = await ctx.runQuery(
      internal.bookPipelineHelpers.getOrder,
      { orderId },
    );
    if (!order) throw new Error('Order not found');
    const key: string | undefined = kind === 'pdf' ? order.printR2Key : order.printLogR2Key;
    if (!key) throw new Error(`Brak ${kind === 'pdf' ? 'pliku drukarskiego' : 'logu'} dla ordera`);
    const format = (order.printPdfFormat ?? 'a5').toUpperCase();
    const filename =
      kind === 'pdf'
        ? bookPdfFilename(order).replace(/\.pdf$/, `_DRUK_${format}.pdf`)
        : `print_${format}_log.txt`;
    return await presignR2GetUrl(key, 900, filename);
  },
});

export const setPrintPdfRequested = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    format: printFormat,
    outputKey: v.string(),
    logKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { orderId, format, outputKey, logKey }) => {
    await ctx.db.patch(orderId, {
      printPdfStatus: 'queued',
      printPdfFormat: format,
      // Klucze zapisujemy od razu — log w R2 ląduje także przy błędzie,
      // a callback może nie dojść.
      printR2Key: undefined,
      printLogR2Key: logKey,
      printPdfError: undefined,
      printPdfMeta: undefined,
      printPdfRequestedAt: Date.now(),
    });
    void outputKey;
    return null;
  },
});

export const markPrintPdfFailed = internalMutation({
  args: { orderId: v.id('bookOrders'), format: printFormat, error: v.string() },
  returns: v.null(),
  handler: async (ctx, { orderId, format, error }) => {
    const order = await ctx.db.get(orderId);
    if (!order || order.printPdfFormat !== format) return null;
    await ctx.db.patch(orderId, { printPdfStatus: 'failed', printPdfError: error });
    return null;
  },
});

/** Aplikuje callback z typst-render (autoryzowany w printPdfHttp.ts). */
export const applyPrintCallback = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    format: printFormat,
    status: v.union(v.literal('ready'), v.literal('failed')),
    outputKey: v.string(),
    logKey: v.string(),
    sizeBytes: v.optional(v.number()),
    pages: v.optional(v.number()),
    pipelineVersion: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    cached: v.optional(v.boolean()),
    errorStep: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    // Spóźniony callback po zleceniu innego formatu — ignoruj; stan śledzi
    // ostatnio żądany format, plik i tak leży w R2 pod swoim kluczem.
    if (order.printPdfFormat !== args.format) return null;

    if (args.status === 'ready') {
      await ctx.db.patch(args.orderId, {
        printPdfStatus: 'ready',
        printR2Key: args.outputKey,
        printLogR2Key: args.logKey,
        printPdfError: undefined,
        printPdfMeta: {
          sizeBytes: args.sizeBytes ?? 0,
          pages: args.pages,
          pipelineVersion: args.pipelineVersion,
          durationMs: args.durationMs,
          generatedAt: Date.now(),
          cached: args.cached,
        },
      });
    } else {
      await ctx.db.patch(args.orderId, {
        printPdfStatus: 'failed',
        printLogR2Key: args.logKey,
        printPdfError: args.errorStep
          ? `[${args.errorStep}] ${args.errorMessage ?? ''}`
          : (args.errorMessage ?? 'unknown'),
      });
    }
    return null;
  },
});
