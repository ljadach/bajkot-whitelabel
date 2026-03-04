"use node";

/**
 * A9 — Book Composer (PDF generation)
 *
 * Generates a children's book PDF from story text + illustrations.
 * Uses jsPDF (pure JS, no native dependencies) for Convex compatibility.
 *
 * Page layout (16 pages, 210mm square):
 *   1  — Cover (title + illustration placeholder)
 *   2  — Dedication
 *   3-14 — 6 beats x 2 pages: illustration page + text page
 *   15 — Parent card
 *   16 — Back cover
 */

import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { parseArtifact } from './lib/bookTypes';
import type { StoryDraft } from './lib/bookTypes';

// Page dimensions in mm (square children's book format)
const PAGE_SIZE_MM = 210;
const MARGIN_MM = 20;

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
      const illustrations = await ctx.runQuery(internal.bookPipelineHelpers.getIllustrations, {
        orderId,
      });

      // Dynamically import jsPDF (ESM)
      const { jsPDF } = await import('jspdf');

      // Create square-format PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [PAGE_SIZE_MM, PAGE_SIZE_MM],
      });

      const contentWidth = PAGE_SIZE_MM - 2 * MARGIN_MM;
      const fontSize = getFontSize(order.ageBracket);

      // Helper to add centered text
      const addCenteredText = (text: string, y: number, size: number) => {
        doc.setFontSize(size);
        const lines = doc.splitTextToSize(text, contentWidth);
        const textHeight = lines.length * size * 0.4;
        const startY = Math.max(y, (PAGE_SIZE_MM - textHeight) / 2);
        doc.text(lines, PAGE_SIZE_MM / 2, startY, { align: 'center' });
      };

      // ── Page 1: Cover ────────────────────────────
      doc.setFontSize(fontSize.title);
      doc.text(draft.title || order.childName, PAGE_SIZE_MM / 2, PAGE_SIZE_MM / 2 - 10, {
        align: 'center',
      });
      doc.setFontSize(fontSize.small);
      doc.text('Bajkot', PAGE_SIZE_MM / 2, PAGE_SIZE_MM - MARGIN_MM, { align: 'center' });

      // ── Page 2: Dedication ───────────────────────
      doc.addPage([PAGE_SIZE_MM, PAGE_SIZE_MM]);
      addCenteredText(draft.dedication || `Dla ${order.childName}`, PAGE_SIZE_MM / 3, fontSize.body);

      // ── Pages 3-14: Story beats ──────────────────
      for (let i = 0; i < (draft.pages?.length || 0); i++) {
        const page = draft.pages[i];
        if (!page) continue;

        // Illustration page (odd)
        doc.addPage([PAGE_SIZE_MM, PAGE_SIZE_MM]);

        // Try to embed illustration if available
        const ill = illustrations.find(
          (il: any) =>
            il.illustrationId === `scene_${page.beatNumber}` ||
            il.illustrationId === `scene_${i + 1}`
        );
        if (ill) {
          try {
            const imageUrl = await ctx.storage.getUrl(ill.storageId);
            if (imageUrl) {
              const response = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
              if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);
              const arrayBuffer = await response.arrayBuffer();
              const uint8 = new Uint8Array(arrayBuffer);
              const base64 = btoa(String.fromCharCode(...uint8));
              doc.addImage(
                `data:image/png;base64,${base64}`,
                'PNG',
                MARGIN_MM,
                MARGIN_MM,
                contentWidth,
                contentWidth
              );
            }
          } catch (e) {
            // If image embedding fails, add placeholder text
            doc.setFontSize(fontSize.small);
            doc.text(`[Ilustracja: Scena ${page.beatNumber}]`, PAGE_SIZE_MM / 2, PAGE_SIZE_MM / 2, {
              align: 'center',
            });
          }
        } else {
          doc.setFontSize(fontSize.small);
          doc.text(`[Ilustracja: Scena ${page.beatNumber}]`, PAGE_SIZE_MM / 2, PAGE_SIZE_MM / 2, {
            align: 'center',
          });
        }

        // Text page (even)
        doc.addPage([PAGE_SIZE_MM, PAGE_SIZE_MM]);
        doc.setFontSize(fontSize.body);
        const textLines = doc.splitTextToSize(page.text || '', contentWidth);
        doc.text(textLines, MARGIN_MM, MARGIN_MM + fontSize.body * 0.4);
      }

      // ── Page 15: Parent card ─────────────────────
      doc.addPage([PAGE_SIZE_MM, PAGE_SIZE_MM]);
      doc.setFontSize(fontSize.title - 4);
      doc.text('Drogi Rodzicu', PAGE_SIZE_MM / 2, MARGIN_MM + 10, { align: 'center' });
      doc.setFontSize(fontSize.small);
      doc.text(
        'Ta bajka zostala stworzona specjalnie dla Twojego dziecka.',
        MARGIN_MM,
        MARGIN_MM + 25,
        { maxWidth: contentWidth }
      );

      // ── Page 16: Back cover ──────────────────────
      doc.addPage([PAGE_SIZE_MM, PAGE_SIZE_MM]);
      doc.setFontSize(fontSize.small);
      doc.text('Stworzone z Bajkot', PAGE_SIZE_MM / 2, PAGE_SIZE_MM / 2, { align: 'center' });
      doc.text(`Dla: ${order.childName}`, PAGE_SIZE_MM / 2, PAGE_SIZE_MM / 2 + 10, {
        align: 'center',
      });

      // Generate PDF buffer
      const pdfArrayBuffer = doc.output('arraybuffer');
      const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
      const pdfStorageId = await ctx.storage.store(pdfBlob);

      // Update order with PDF storage ID
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
