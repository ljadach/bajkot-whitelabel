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
import PDFDocument from 'pdfkit';

// Page dimensions in points (210mm square)
const PAGE_SIZE = 595.28;
const MARGIN = 56.7; // ~20mm
const CONTENT_WIDTH = PAGE_SIZE - 2 * MARGIN;

// Font config key in adminConfig
const FONT_STORAGE_KEY = 'notoSansStorageId';
const NOTO_SANS_URL =
  'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-400-normal.ttf';
const NOTO_SANS_BOLD_URL =
  'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-700-normal.ttf';
const FONT_BOLD_STORAGE_KEY = 'notoSansBoldStorageId';

export const generatePdf = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    try {
      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order?.storyDraft || !order?.characterProfile) {
        throw new Error('Missing story draft or character profile');
      }

      const draft = parseArtifact<StoryDraft>(order.storyDraft, 'storyDraft');
      const profile = parseArtifact<CharacterProfile>(order.characterProfile, 'characterProfile');
      const blueprint = order.storyBlueprint
        ? parseArtifact<StoryBlueprint>(order.storyBlueprint, 'storyBlueprint')
        : null;
      const illustrations = await ctx.runQuery(internal.bookPipelineHelpers.getIllustrations, {
        orderId,
      });
      const fontSize = getFontSize(order.ageBracket);

      // Load fonts
      const { regular, bold } = await loadFonts(ctx);

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

      // Register fonts
      if (regular) {
        doc.registerFont('NotoSans', regular);
        doc.registerFont('Body', regular);
      } else {
        doc.registerFont('Body', 'Helvetica');
      }
      if (bold) {
        doc.registerFont('NotoSansBold', bold);
        doc.registerFont('Title', bold);
      } else {
        doc.registerFont('Title', 'Helvetica-Bold');
      }

      // ── Page 1: Cover ────────────────────────────
      doc.addPage({ size: [PAGE_SIZE, PAGE_SIZE], margin: 0 });

      // Try to embed cover illustration full-bleed
      const coverIll = illustrations.find((il: any) => il.illustrationId === 'cover');
      if (coverIll) {
        const coverBuf = await fetchImageBuffer(ctx, coverIll.storageId);
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
      for (let i = 0; i < (draft.pages?.length || 0); i++) {
        const page = draft.pages[i];
        if (!page) continue;

        // Illustration page (full-bleed)
        doc.addPage({ size: [PAGE_SIZE, PAGE_SIZE], margin: 0 });

        const ill = illustrations.find(
          (il: any) =>
            il.illustrationId === `scene_${page.beatNumber}` ||
            il.illustrationId === `scene_${i + 1}`,
        );
        if (ill) {
          const imgBuf = await fetchImageBuffer(ctx, ill.storageId);
          if (imgBuf) {
            doc.image(imgBuf, 0, 0, { width: PAGE_SIZE, height: PAGE_SIZE });
          } else {
            drawPlaceholder(doc, `Scena ${page.beatNumber}`, fontSize.small);
          }
        } else {
          drawPlaceholder(doc, `Scena ${page.beatNumber}`, fontSize.small);
        }

        // Text page
        doc.addPage({ size: [PAGE_SIZE, PAGE_SIZE], margin: MARGIN });
        doc.font('Body').fontSize(fontSize.body).fillColor('#333333');
        const text = page.text || '';
        const textHeight = doc.heightOfString(text, { width: CONTENT_WIDTH });
        const textY = Math.max(MARGIN, (PAGE_SIZE - textHeight) / 2);
        doc.text(text, MARGIN, textY, { width: CONTENT_WIDTH });
      }

      // ── Page 15: Parent card ─────────────────────
      doc.addPage({ size: [PAGE_SIZE, PAGE_SIZE], margin: MARGIN });
      doc
        .font('Title')
        .fontSize(fontSize.title - 4)
        .fillColor('#333333');
      doc.text('Drogi Rodzicu', MARGIN, MARGIN, {
        width: CONTENT_WIDTH,
        align: 'center',
      });

      doc.moveDown(1);
      doc.font('Body').fontSize(fontSize.small).fillColor('#444444');
      doc.text(
        `Ta bajka została stworzona specjalnie dla ${order.childName}. ` +
          'Poniżej znajdziesz pytania, które możesz zadać dziecku po przeczytaniu bajki, ' +
          'aby porozmawiać o uczuciach i doświadczeniach bohatera.',
        { width: CONTENT_WIDTH },
      );

      // Discussion questions from blueprint
      if (blueprint?.beats) {
        doc.moveDown(1);
        doc.font('Title').fontSize(fontSize.small + 1);
        doc.text('Pytania do rozmowy:', { width: CONTENT_WIDTH });
        doc.moveDown(0.5);
        doc.font('Body').fontSize(fontSize.small);

        const questions = blueprint.beats
          .filter((b) => b.therapeuticGoal)
          .slice(0, 4)
          .map(
            (b) =>
              `• Jak myślisz, co czuł ${profile.childName || order.childName} gdy ${b.summary.toLowerCase().slice(0, 60)}?`,
          );
        for (const q of questions) {
          doc.text(q, { width: CONTENT_WIDTH });
          doc.moveDown(0.3);
        }
      }

      // ── Page 16: Back cover ──────────────────────
      doc.addPage({ size: [PAGE_SIZE, PAGE_SIZE], margin: MARGIN });
      doc.font('Body').fontSize(fontSize.small).fillColor('#666666');
      const backText = `Stworzone z miłością przez Bajkot\nDla: ${order.childName}`;
      const backHeight = doc.heightOfString(backText, { width: CONTENT_WIDTH, align: 'center' });
      const backY = (PAGE_SIZE - backHeight) / 2;
      doc.text(backText, MARGIN, backY, {
        width: CONTENT_WIDTH,
        align: 'center',
      });

      // Finalize
      doc.end();
      const pdfBuffer = await pdfDone;

      const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
      const pdfStorageId = await ctx.storage.store(pdfBlob);

      await ctx.runMutation(internal.bookPipelineHelpers.updatePdfStorageId, {
        orderId,
        pdfStorageId,
      });

      // Schedule A10 (final QA)
      await ctx.scheduler.runAfter(0, internal.bookAgents.reviewFinal, { orderId });
    } catch (error) {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A9',
        error: error instanceof Error ? error.message : String(error),
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
    if (!url) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.warn('Failed to fetch image from storage:', e);
    return null;
  }
}

/**
 * Load NotoSans fonts. Checks adminConfig for cached storage ID,
 * otherwise fetches from CDN and caches in Convex file storage.
 */
async function loadFonts(ctx: ActionCtx): Promise<{ regular: Buffer | null; bold: Buffer | null }> {
  let regular: Buffer | null = null;
  let bold: Buffer | null = null;

  try {
    // Try loading cached regular font
    regular = await loadCachedFont(ctx, FONT_STORAGE_KEY, NOTO_SANS_URL);
    bold = await loadCachedFont(ctx, FONT_BOLD_STORAGE_KEY, NOTO_SANS_BOLD_URL);
  } catch (e) {
    console.warn('Failed to load NotoSans fonts, falling back to Helvetica:', e);
  }

  return { regular, bold };
}

async function loadCachedFont(
  ctx: ActionCtx,
  configKey: string,
  cdnUrl: string,
): Promise<Buffer | null> {
  // Check adminConfig for cached storage ID
  const cachedId = await ctx.runQuery(internal.admin.config.getInternal, { key: configKey });
  if (cachedId) {
    try {
      const buf = await fetchStorageBuffer(ctx, cachedId as unknown as Id<'_storage'>);
      if (buf) return buf;
    } catch {
      // Cache miss — re-fetch
    }
  }

  // Fetch from CDN
  const res = await fetch(cdnUrl, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) {
    console.warn(`Failed to fetch font from ${cdnUrl}: ${res.status}`);
    return null;
  }
  const buf = Buffer.from(await res.arrayBuffer());

  // Cache in storage
  try {
    const blob = new Blob([new Uint8Array(buf)], { type: 'font/ttf' });
    const storageId = await ctx.storage.store(blob);
    await ctx.runMutation(internal.admin.config.setInternal, {
      key: configKey,
      value: storageId,
    });
  } catch (e) {
    console.warn('Failed to cache font in storage:', e);
  }

  return buf;
}

async function fetchStorageBuffer(
  ctx: ActionCtx,
  storageId: Id<'_storage'>,
): Promise<Buffer | null> {
  const url = await ctx.storage.getUrl(storageId);
  if (!url) return null;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}
