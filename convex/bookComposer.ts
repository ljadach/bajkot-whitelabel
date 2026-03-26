'use node';

/**
 * A9 — Book Composer (PDF generation)
 *
 * Generates a children's book PDF from story text + illustrations.
 * Uses PDFKit with NotoSans font for Polish diacritic support.
 *
 * Page layout (16 pages, 595.28pt square ≈ 210mm):
 *   1  — Cover (full-bleed illustration + title overlay)
 *   2  — Dedication
 *   3-14 — 6 beats x 2 pages: illustration full-page + text centered vertically
 *   15 — Parent card (discussion questions + activity)
 *   16 — Back cover (blurb + branding)
 */

import { internalAction, type ActionCtx } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { parseArtifact } from './lib/bookTypes';
import type { StoryDraft, StoryBlueprint, CharacterProfile } from './lib/bookTypes';
import type { Id } from './_generated/dataModel';
import { getNarrative } from './bookPipelineEvents';
import PDFDocument from 'pdfkit';

// PDFKit's constructor calls initFonts() → font('Helvetica') which tries to
// load Helvetica.afm from filesystem. On Convex serverless runtime those AFM
// files don't exist. We skip the default font load — we register NotoSans
// custom fonts immediately after construction instead.
const _origInitFonts = PDFDocument.prototype.initFonts;
PDFDocument.prototype.initFonts = function (this: any) {
  this._fontFamilies = {};
  this._fontCount = 0;
  this._fontSize = 12;
  this._font = null;
  this._registeredFonts = {};
  // intentionally skip this.font('Helvetica')
};

// Page dimensions in points (210mm square)
const PAGE_SIZE = 595.28;
const MARGIN = 56.7; // ~20mm
const CONTENT_WIDTH = PAGE_SIZE - 2 * MARGIN;

// Full NotoSans (not subset) — latin-ext subset only has diacritics, missing a-z/A-Z
const NOTO_SANS_URL =
  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSans/full/ttf/NotoSans-Regular.ttf';
const NOTO_SANS_BOLD_URL =
  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSans/full/ttf/NotoSans-Bold.ttf';

export const generatePdf = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    const log = (msg: string, data?: Record<string, unknown>) => {
      const entry = `[A9:PDF] ${msg}`;
      if (data) {
        console.log(entry, JSON.stringify(data, null, 2));
      } else {
        console.log(entry);
      }
    };

    try {
      log('Starting PDF generation', { orderId });

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      log('Order loaded', {
        hasOrder: !!order,
        hasStoryDraft: !!order?.storyDraft,
        hasCharacterProfile: !!order?.characterProfile,
        hasStoryBlueprint: !!order?.storyBlueprint,
        ageBracket: order?.ageBracket,
        childName: order?.childName,
      });
      if (!order?.storyDraft || !order?.characterProfile) {
        throw new Error('Missing story draft or character profile');
      }

      const draft = parseArtifact<StoryDraft>(order.storyDraft, 'storyDraft');
      log('Story draft parsed', {
        title: draft.title,
        pagesCount: draft.pages?.length,
        hasDedication: !!draft.dedication,
        hasParentCard: !!draft.parentCard,
        hasCoverBlurb: !!draft.coverBlurb,
      });

      const profile = parseArtifact<CharacterProfile>(order.characterProfile, 'characterProfile');
      log('Character profile parsed', { childName: profile.childName });

      const blueprint = order.storyBlueprint
        ? parseArtifact<StoryBlueprint>(order.storyBlueprint, 'storyBlueprint')
        : null;
      log('Blueprint', { hasBlueprint: !!blueprint, beatsCount: blueprint?.beats?.length });

      const illustrations = await ctx.runQuery(internal.bookPipelineHelpers.getIllustrations, {
        orderId,
      });
      log('Illustrations loaded', {
        count: illustrations.length,
        ids: illustrations.map((il: any) => il.illustrationId),
        storageIds: illustrations.map((il: any) => il.storageId),
      });

      const fontSize = getFontSize(order.ageBracket);
      log('Font size config', { ageBracket: order.ageBracket, ...fontSize });

      // Load fonts
      log('Loading fonts from CDN...', {
        regularUrl: NOTO_SANS_URL,
        boldUrl: NOTO_SANS_BOLD_URL,
      });
      const fontLoadStart = Date.now();
      const { regular, bold } = await loadFonts();
      log('Fonts loaded', {
        regularSize: regular.length,
        boldSize: bold.length,
        loadTimeMs: Date.now() - fontLoadStart,
      });

      // Create square-format PDF
      const doc = new PDFDocument({
        size: [PAGE_SIZE, PAGE_SIZE],
        autoFirstPage: false,
        bufferPages: true,
        margin: MARGIN,
      });

      // Collect PDF into buffer
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      const pdfDone = new Promise<Buffer>((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
      });

      // Register fonts (NotoSans for Polish diacritics)
      if (!regular || !bold) {
        throw new Error('Font loading failed — NotoSans unavailable, retry needed');
      }
      log('Registering fonts with PDFKit...');
      doc.registerFont('Body', regular);
      doc.registerFont('Title', bold);
      doc.font('Body'); // Set default font (initFonts was patched to skip Helvetica)
      log('Fonts registered successfully');

      // ── Page 1: Cover ────────────────────────────
      log('Building page 1: Cover');
      doc.addPage({ size: [PAGE_SIZE, PAGE_SIZE], margin: 0 });

      // Try to embed cover illustration full-bleed
      const coverIll = illustrations.find((il: any) => il.illustrationId === 'cover');
      log('Cover illustration', { found: !!coverIll, storageId: coverIll?.storageId });
      if (coverIll) {
        const coverBuf = await fetchImageBuffer(ctx, coverIll.storageId);
        log('Cover image buffer', { fetched: !!coverBuf, size: coverBuf?.length });
        if (coverBuf) {
          doc.image(coverBuf, 0, 0, { width: PAGE_SIZE, height: PAGE_SIZE });
        }
      }

      // Title overlay (white box with opacity)
      const overlayY = PAGE_SIZE * 0.65;
      const overlayH = PAGE_SIZE * 0.25;
      doc.save();
      doc.opacity(0.85);
      doc.rect(0, overlayY, PAGE_SIZE, overlayH).fill('#FFFFFF');
      doc.restore();
      doc.opacity(1);
      doc.font('Title').fontSize(fontSize.title).fillColor('#333333');
      doc.text(draft.title || order.childName, MARGIN, overlayY + 20, {
        width: CONTENT_WIDTH,
        align: 'center',
      });
      doc.font('Body').fontSize(fontSize.small).fillColor('#666666');
      doc.text('Bajkot', MARGIN, overlayY + overlayH - 30, {
        width: CONTENT_WIDTH,
        align: 'center',
      });

      // ── Page 2: Dedication ───────────────────────
      log('Building page 2: Dedication');
      doc.addPage({ size: [PAGE_SIZE, PAGE_SIZE], margin: MARGIN });
      doc.font('Body').fontSize(fontSize.body).fillColor('#333333');
      const dedicationText = draft.dedication || `Dla ${order.childName}`;
      const dedHeight = doc.heightOfString(dedicationText, {
        width: CONTENT_WIDTH,
        align: 'center',
      });
      const dedY = (PAGE_SIZE - dedHeight) / 2;
      doc.text(dedicationText, MARGIN, dedY, {
        width: CONTENT_WIDTH,
        align: 'center',
      });

      // ── Pages 3-14: Story beats ──────────────────
      log('Building story pages', { pagesCount: draft.pages?.length || 0 });
      for (let i = 0; i < (draft.pages?.length || 0); i++) {
        const page = draft.pages[i];
        if (!page) continue;

        log(`Story beat ${i + 1}/${draft.pages.length}`, {
          beatNumber: page.beatNumber,
          textLength: page.text?.length,
        });

        // Illustration page (full-bleed)
        doc.addPage({ size: [PAGE_SIZE, PAGE_SIZE], margin: 0 });

        const ill = illustrations.find(
          (il: any) =>
            il.illustrationId === `scene_${page.beatNumber}` ||
            il.illustrationId === `scene_${i + 1}`,
        );
        log(`Beat ${page.beatNumber} illustration`, {
          found: !!ill,
          lookupKeys: [`scene_${page.beatNumber}`, `scene_${i + 1}`],
          storageId: ill?.storageId,
        });

        const imgBuf = ill ? await fetchImageBuffer(ctx, ill.storageId) : null;
        if (imgBuf) {
          log(`Beat ${page.beatNumber} image embedded`, { size: imgBuf.length });
          doc.image(imgBuf, 0, 0, { width: PAGE_SIZE, height: PAGE_SIZE });
        } else {
          log(`Beat ${page.beatNumber} — no image, using placeholder`);
          drawPlaceholder(doc, `Scena ${page.beatNumber}`, fontSize.small);
        }

        // Text page
        doc.addPage({ size: [PAGE_SIZE, PAGE_SIZE], margin: MARGIN });
        doc.font('Body').fontSize(fontSize.body).fillColor('#333333');
        const text = page.text || '';
        const textHeight = doc.heightOfString(text, { width: CONTENT_WIDTH });
        const textY = Math.max(MARGIN, (PAGE_SIZE - textHeight) / 2);
        doc.text(text, MARGIN, textY, { width: CONTENT_WIDTH });
        log(`Beat ${page.beatNumber} text page done`, { textHeight, textY });
      }

      // ── Page 15: Parent card ─────────────────────
      log('Building page 15: Parent card');
      doc.addPage({ size: [PAGE_SIZE, PAGE_SIZE], margin: MARGIN });

      const parentCard = draft.parentCard;
      const cardTitle = parentCard?.title || 'Drogi Rodzicu';
      const cardIntro =
        parentCard?.introPl ||
        `Ta bajka została stworzona specjalnie dla ${order.childName}. ` +
          'Poniżej znajdziesz pytania, które możesz zadać dziecku po przeczytaniu bajki, ' +
          'aby porozmawiać o uczuciach i doświadczeniach bohatera.';

      doc
        .font('Title')
        .fontSize(fontSize.title - 4)
        .fillColor('#333333');
      doc.text(cardTitle, MARGIN, MARGIN, {
        width: CONTENT_WIDTH,
        align: 'center',
      });

      doc.moveDown(1);
      doc.font('Body').fontSize(fontSize.small).fillColor('#444444');
      doc.text(cardIntro, { width: CONTENT_WIDTH });

      // Discussion questions -- prefer LLM-generated, fallback to blueprint
      let questions: string[];
      if (parentCard?.questions && parentCard.questions.length > 0) {
        questions = parentCard.questions.map((q) => `• ${q}`);
      } else {
        const name = profile.childName || order.childName;
        questions = (blueprint?.beats || [])
          .filter((b) => b.therapeuticGoal)
          .slice(0, 4)
          .map(
            (b) => `• Jak myślisz, co czuł ${name} gdy ${b.summary.toLowerCase().slice(0, 60)}?`,
          );
      }

      if (questions.length > 0) {
        doc.moveDown(1);
        doc.font('Title').fontSize(fontSize.small + 1);
        doc.text('Pytania do rozmowy:', { width: CONTENT_WIDTH });
        doc.moveDown(0.5);
        doc.font('Body').fontSize(fontSize.small);

        for (const q of questions) {
          doc.text(q, { width: CONTENT_WIDTH });
          doc.moveDown(0.3);
        }
      }

      // Activity section (trustee parity)
      if (parentCard?.activityPl) {
        doc.moveDown(0.8);
        doc.font('Title').fontSize(fontSize.small + 1);
        doc.text('Wspólna aktywność:', { width: CONTENT_WIDTH });
        doc.moveDown(0.5);
        doc.font('Body').fontSize(fontSize.small);
        doc.text(parentCard.activityPl, { width: CONTENT_WIDTH });
      }

      // ── Page 16: Back cover ──────────────────────
      log('Building page 16: Back cover');
      doc.addPage({ size: [PAGE_SIZE, PAGE_SIZE], margin: MARGIN });
      doc.font('Body').fontSize(fontSize.small).fillColor('#666666');

      const blurb = draft.coverBlurb || '';
      const colophon = `Stworzone z miłością przez Bajkot\n© ${new Date().getFullYear()} Bajkot`;
      const backText = blurb ? `${blurb}\n\n${colophon}` : `Dla: ${order.childName}\n\n${colophon}`;
      const backHeight = doc.heightOfString(backText, { width: CONTENT_WIDTH, align: 'center' });
      const backY = (PAGE_SIZE - backHeight) / 2;
      doc.text(backText, MARGIN, backY, {
        width: CONTENT_WIDTH,
        align: 'center',
      });

      // Finalize
      log('Finalizing PDF document...');
      doc.end();
      const pdfBuffer = await pdfDone;
      log('PDF buffer ready', {
        sizeBytes: pdfBuffer.length,
        sizeKb: Math.round(pdfBuffer.length / 1024),
      });

      const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
      const pdfStorageId = await ctx.storage.store(pdfBlob);
      log('PDF stored in Convex storage', { pdfStorageId });

      await ctx.runMutation(internal.bookPipelineHelpers.updatePdfStorageId, {
        orderId,
        pdfStorageId,
      });
      log('Order updated with PDF storage ID');

      await ctx.runMutation(internal.bookPipelineEvents.recordEvent, {
        orderId,
        agent: 'A9',
        event: 'complete',
        narrative: getNarrative('A9', 'complete'),
      });

      // Schedule A10 (final QA)
      await ctx.scheduler.runAfter(0, internal.bookAgents.reviewFinal, { orderId });
      log('PDF generation complete, A10 scheduled');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : undefined;
      console.error('[A9:PDF] FAILED:', errMsg);
      console.error('[A9:PDF] Stack:', errStack);
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

// ── Helpers ────────────────────────────────────────────

function getFontSize(ageBracket: string): { body: number; title: number; small: number } {
  switch (ageBracket) {
    case '3-5':
      return { body: 18, title: 28, small: 12 };
    case '6-8':
      return { body: 14, title: 24, small: 11 };
    default:
      return { body: 12, title: 22, small: 10 };
  }
}

function drawPlaceholder(doc: PDFKit.PDFDocument, label: string, fontSize: number) {
  doc.font('Body').fontSize(fontSize).fillColor('#999999');
  doc.text(`[Ilustracja: ${label}]`, 0, PAGE_SIZE / 2 - fontSize, {
    width: PAGE_SIZE,
    align: 'center',
  });
}

async function fetchImageBuffer(ctx: ActionCtx, storageId: Id<'_storage'>): Promise<Buffer | null> {
  try {
    const url = await ctx.storage.getUrl(storageId);
    if (!url) {
      console.warn(`[A9:PDF] No URL for storageId=${storageId}`);
      return null;
    }
    const start = Date.now();
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      console.warn(`[A9:PDF] Image fetch failed: storageId=${storageId} → ${res.status}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(
      `[A9:PDF] Image fetched: storageId=${storageId}, ${buf.length} bytes, ${Date.now() - start}ms`,
    );
    return buf;
  } catch (e) {
    console.warn(`[A9:PDF] Image fetch error for storageId=${storageId}:`, e);
    return null;
  }
}

async function fetchFont(url: string): Promise<Buffer> {
  console.log(`[A9:PDF] Fetching font: ${url}`);
  const start = Date.now();
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) {
    console.error(`[A9:PDF] Font fetch FAILED: ${url} → ${res.status} ${res.statusText}`);
    throw new Error(`Font fetch failed: ${url} → ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`[A9:PDF] Font fetched OK: ${url} — ${buf.length} bytes in ${Date.now() - start}ms`);
  return buf;
}

async function loadFonts(): Promise<{ regular: Buffer; bold: Buffer }> {
  const [regular, bold] = await Promise.all([
    fetchFont(NOTO_SANS_URL),
    fetchFont(NOTO_SANS_BOLD_URL),
  ]);
  return { regular, bold };
}
