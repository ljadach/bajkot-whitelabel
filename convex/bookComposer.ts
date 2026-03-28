'use node';

/**
 * A9 - Book Composer (PDF generation)
 *
 * Generates a children's book PDF as a landscape A4 booklet.
 * Each printed sheet has 2 book pages side by side.
 *
 * Layout (5 PDF pages = 10 book pages):
 *   Sheet 1: Cover (left) + Dedication (right)
 *   Sheet 2: Beat 1 (left) + Beat 2 (right)
 *   Sheet 3: Beat 3 (left) + Beat 4 (right)
 *   Sheet 4: Beat 5 (left) + Beat 6 (right)
 *   Sheet 5: Parent card (left) + Back cover (right)
 *
 * Each book page: illustration top ~53%, text bottom ~40%
 * Fonts: NotoSans Regular + Bold (Polish diacritics)
 * Decorative elements: leaf paths, rounded boxes, color washes
 */

import { internalAction, type ActionCtx } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { parseArtifact } from './lib/bookTypes';
import type { StoryDraft, StoryBlueprint, CharacterProfile } from './lib/bookTypes';
import type { Id } from './_generated/dataModel';
import { getNarrative } from './bookPipelineEvents';
import PDFDocument from 'pdfkit';

// Patch initFonts - Convex runtime has no Helvetica.afm files
PDFDocument.prototype.initFonts = function (this: any) {
  this._fontFamilies = {};
  this._fontCount = 0;
  this._fontSize = 12;
  this._font = null;
  this._registeredFonts = {};
};

// ── Dimensions (points) ──────────────────────────────────
// A4 landscape: 297mm x 210mm = 841.89pt x 595.28pt
const SHEET_W = 841.89;
const SHEET_H = 595.28;
const HALF_W = SHEET_W / 2; // ~420.94pt = one book page width
const PAGE_M = 22.68; // ~8mm margin
const DIVIDER_X = HALF_W; // vertical center divider

// Book page content area
const BPC_W = HALF_W - PAGE_M * 2; // content width per book page
const BPC_H = SHEET_H - PAGE_M * 2; // content height per book page

// Illustration area: top 53% of content
const ILL_H = BPC_H * 0.53;
const ILL_R = 8; // corner radius for illustration frame
const ILL_GAP = 8; // gap between illustration and text

// Text area: remaining space below illustration
const TEXT_TOP = PAGE_M + ILL_H + ILL_GAP;
const TEXT_H = BPC_H - ILL_H - ILL_GAP;

// Font CDN
const NOTO_SANS_URL =
  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSans/full/ttf/NotoSans-Regular.ttf';
const NOTO_SANS_BOLD_URL =
  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSans/full/ttf/NotoSans-Bold.ttf';

// ── Colors ───────────────────────────────────────────────
const C = {
  brown: '#4e342e',
  brownLight: '#8d6e63',
  brownMuted: '#bcaaa4',
  cream: '#fff8e1',
  creamDark: '#fff3e0',
  greenLight: '#e8f5e9',
  greenMid: '#c8e6c9',
  greenDark: '#2e7d32',
  greenLeaf: '#81c784',
  orange: '#ff9800',
  orangeDark: '#e65100',
  orangeLight: '#ffe0b2',
  pink: '#ef9a9a',
  white: '#ffffff',
  nightSky: '#1a237e',
  nightMid: '#283593',
};

// ── Font sizes per age bracket ───────────────────────────
function getFontSize(ageBracket: string) {
  switch (ageBracket) {
    case '3-5':
      return { body: 13, title: 20, small: 10, lineGap: 5 };
    case '6-8':
      return { body: 11, title: 18, small: 9, lineGap: 4 };
    default:
      return { body: 9.5, title: 16, small: 8, lineGap: 3 };
  }
}

// ── Main action ──────────────────────────────────────────

export const generatePdf = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    const log = (msg: string, data?: Record<string, unknown>) => {
      console.log(`[A9:PDF] ${msg}`, data ? JSON.stringify(data) : '');
    };

    try {
      log('Starting PDF generation (landscape A4 booklet)', { orderId });

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
      log('Data loaded', {
        title: draft.title,
        pages: draft.pages?.length,
        illustrations: illustrations.length,
      });

      const fs = getFontSize(order.ageBracket);
      const { regular, bold } = await loadFonts();

      // Create landscape A4 PDF
      const doc = new PDFDocument({
        size: [SHEET_W, SHEET_H],
        autoFirstPage: false,
        bufferPages: true,
        margin: 0,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      const pdfDone = new Promise<Buffer>((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
      });

      doc.registerFont('Body', regular);
      doc.registerFont('Title', bold);
      doc.registerFont('Helvetica', regular);
      doc.registerFont('Helvetica-Bold', bold);
      doc.font('Body');

      // Helper to get illustration buffer
      const getIllBuf = async (id: string): Promise<Buffer | null> => {
        const ill = illustrations.find((il: any) => il.illustrationId === id);
        if (!ill) return null;
        return fetchImageBuffer(ctx, ill.storageId);
      };

      // Get text for a beat - prefer readAloudVersion for young kids
      const getBeatText = (pageIndex: number): string => {
        const page = draft.pages?.[pageIndex];
        if (!page) return '';
        if (order.ageBracket === '3-5' && page.readAloudVersion) {
          return page.readAloudVersion;
        }
        return page.text || '';
      };

      const title = draft.title || `Książeczka dla ${order.childName}`;
      const subtitle = blueprint?.subtitle || '';
      const dedication = draft.dedication || `Dla ${order.childName}`;

      // ═══════════════════════════════════════════════════
      // SHEET 1: Cover + Dedication
      // ═══════════════════════════════════════════════════
      log('Sheet 1: Cover + Dedication');
      doc.addPage({ size: [SHEET_W, SHEET_H], margin: 0 });

      // -- LEFT: Cover --
      await drawCover(doc, {
        title,
        subtitle,
        childName: order.childName,
        coverBuf: await getIllBuf('cover'),
        fs,
      });

      // -- Divider line (subtle dashed) --
      drawDivider(doc);

      // -- RIGHT: Dedication --
      drawDedication(doc, dedication, fs);

      // ═══════════════════════════════════════════════════
      // SHEETS 2-4: Beat pages (6 beats, 2 per sheet)
      // ═══════════════════════════════════════════════════
      for (let sheetIdx = 0; sheetIdx < 3; sheetIdx++) {
        const beatA = sheetIdx * 2;
        const beatB = sheetIdx * 2 + 1;
        log(`Sheet ${sheetIdx + 2}: Beats ${beatA + 1} & ${beatB + 1}`);
        doc.addPage({ size: [SHEET_W, SHEET_H], margin: 0 });

        // Left beat page
        const illBufA = await getIllBuf(`scene_${beatA + 1}`);
        drawBeatPage(doc, {
          side: 'left',
          text: getBeatText(beatA),
          imgBuf: illBufA,
          pageNum: beatA + 1,
          fs,
          decoVariant: beatA,
        });

        drawDivider(doc);

        // Right beat page
        const illBufB = await getIllBuf(`scene_${beatB + 1}`);
        drawBeatPage(doc, {
          side: 'right',
          text: getBeatText(beatB),
          imgBuf: illBufB,
          pageNum: beatB + 1,
          fs,
          decoVariant: beatB,
        });
      }

      // ═══════════════════════════════════════════════════
      // SHEET 5: Parent card + Back cover
      // ═══════════════════════════════════════════════════
      log('Sheet 5: Parent card + Back cover');
      doc.addPage({ size: [SHEET_W, SHEET_H], margin: 0 });

      drawParentCard(doc, {
        draft,
        profile,
        blueprint,
        childName: order.childName,
        fs,
      });

      drawDivider(doc);

      drawBackCover(doc, {
        childName: order.childName,
        blurb: draft.coverBlurb || '',
        fs,
      });

      // ═══════════════════════════════════════════════════
      // Finalize & store
      // ═══════════════════════════════════════════════════
      doc.end();
      const pdfBuffer = await pdfDone;
      log('PDF ready', { sizeKb: Math.round(pdfBuffer.length / 1024) });

      const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
      const pdfStorageId = await ctx.storage.store(pdfBlob);

      await ctx.runMutation(internal.bookPipelineHelpers.updatePdfStorageId, {
        orderId,
        pdfStorageId,
      });

      await ctx.runMutation(internal.bookPipelineEvents.recordEvent, {
        orderId,
        agent: 'A9',
        event: 'complete',
        narrative: getNarrative('A9', 'complete'),
      });

      await ctx.scheduler.runAfter(0, internal.bookAgents.reviewFinal, { orderId });
      log('Done, A10 scheduled');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[A9:PDF] FAILED:', errMsg);
      console.error('[A9:PDF] Stack:', error instanceof Error ? error.stack : '');
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

// ══════════════════════════════════════════════════════════
// PAGE DRAWING FUNCTIONS
// ══════════════════════════════════════════════════════════

// ── Divider ──────────────────────────────────────────────
function drawDivider(doc: PDFKit.PDFDocument) {
  doc.save();
  doc.strokeColor('#e0e0e0').lineWidth(0.5).dash(4, { space: 3 });
  doc
    .moveTo(DIVIDER_X, 10)
    .lineTo(DIVIDER_X, SHEET_H - 10)
    .stroke();
  doc.restore();
  doc.undash();
}

// ── Cover (left half) ────────────────────────────────────
interface CoverOpts {
  title: string;
  subtitle: string;
  childName: string;
  coverBuf: Buffer | null;
  fs: ReturnType<typeof getFontSize>;
}

async function drawCover(doc: PDFKit.PDFDocument, opts: CoverOpts) {
  const { title, subtitle, childName, coverBuf, fs } = opts;
  const x0 = 0;

  if (coverBuf) {
    // Full-bleed cover illustration on left half
    doc.save();
    doc.rect(x0, 0, HALF_W, SHEET_H).clip();
    doc.image(coverBuf, x0, 0, { width: HALF_W, height: SHEET_H, cover: [HALF_W, SHEET_H] as any });
    doc.restore();

    // Gradient overlay at bottom for text legibility
    const gradTop = SHEET_H * 0.5;
    for (let i = 0; i < 40; i++) {
      const y = gradTop + (SHEET_H - gradTop) * (i / 40);
      const alpha = (i / 40) * 0.88;
      doc.save();
      doc.opacity(alpha);
      doc.rect(x0, y, HALF_W, (SHEET_H - gradTop) / 40 + 1).fill(C.white);
      doc.restore();
    }
    doc.opacity(1);
  } else {
    // Fallback: night sky gradient
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const y = (SHEET_H / steps) * i;
      const t = i / steps;
      // Simple dark blue gradient
      const r = Math.round(26 + t * 20);
      const g = Math.round(35 + t * 40);
      const b = Math.round(126 + t * 40);
      doc.rect(x0, y, HALF_W, SHEET_H / steps + 1).fill(`rgb(${r},${g},${b})`);
    }
    // Moon
    doc.save();
    doc.circle(HALF_W - 50, 60, 25).fill('#fff9c4');
    doc.circle(HALF_W - 50, 60, 20).fill('#fff176');
    doc.restore();
    // Stars
    for (let i = 0; i < 30; i++) {
      const sx = x0 + 15 + Math.random() * (HALF_W - 30);
      const sy = 15 + Math.random() * (SHEET_H * 0.5);
      const sr = 0.8 + Math.random() * 1.5;
      doc.save();
      doc.opacity(0.3 + Math.random() * 0.5);
      doc.circle(sx, sy, sr).fill(C.white);
      doc.restore();
    }
    doc.opacity(1);
  }

  // Title block at bottom of left half
  const titleY = SHEET_H - 130;
  doc
    .font('Title')
    .fontSize(fs.title + 2)
    .fillColor(C.brown);
  doc.text(title, x0 + PAGE_M, titleY, {
    width: HALF_W - PAGE_M * 2,
    align: 'center',
    lineGap: 2,
  });

  if (subtitle) {
    doc.font('Body').fontSize(fs.small).fillColor(C.brownLight);
    doc.text(subtitle, x0 + PAGE_M, doc.y + 4, {
      width: HALF_W - PAGE_M * 2,
      align: 'center',
    });
  }

  doc
    .font('Body')
    .fontSize(fs.small - 1)
    .fillColor(C.brownMuted);
  doc.text(`Książeczka dla ${childName}`, x0 + PAGE_M, doc.y + 6, {
    width: HALF_W - PAGE_M * 2,
    align: 'center',
  });

  // Decorative branch at very bottom
  drawLeaf(doc, x0 + HALF_W / 2 - 20, SHEET_H - 30, 0.5);
  drawLeaf(doc, x0 + HALF_W / 2 + 10, SHEET_H - 28, 0.5, true);
}

// ── Dedication (right half) ──────────────────────────────
function drawDedication(doc: PDFKit.PDFDocument, text: string, fs: ReturnType<typeof getFontSize>) {
  const x0 = HALF_W;

  // Cream background
  doc.rect(x0, 0, HALF_W, SHEET_H).fill(C.cream);

  // Corner decorations
  drawLeaf(doc, x0 + PAGE_M, PAGE_M + 5, 0.3);
  drawFlower(doc, x0 + HALF_W - PAGE_M - 18, SHEET_H - PAGE_M - 18, 0.3);
  drawFlower(doc, x0 + HALF_W - PAGE_M - 18, PAGE_M + 5, 0.2);

  // Centered dedication text
  doc
    .font('Body')
    .fontSize(fs.body + 1)
    .fillColor(C.brown);
  const dedH = doc.heightOfString(text, { width: BPC_W - 40, align: 'center' });
  const dedY = (SHEET_H - dedH) / 2;
  doc.text(text, x0 + PAGE_M + 20, dedY, {
    width: BPC_W - 40,
    align: 'center',
    lineGap: 6,
    characterSpacing: 0.3,
  });

  // Heart below dedication
  drawHeart(doc, x0 + HALF_W / 2 - 6, dedY + dedH + 16, 0.4);
}

// ── Beat page (one book page within a sheet) ─────────────
interface BeatOpts {
  side: 'left' | 'right';
  text: string;
  imgBuf: Buffer | null;
  pageNum: number;
  fs: ReturnType<typeof getFontSize>;
  decoVariant: number;
}

function drawBeatPage(doc: PDFKit.PDFDocument, opts: BeatOpts) {
  const { side, text, imgBuf, pageNum, fs, decoVariant } = opts;
  const x0 = side === 'left' ? 0 : HALF_W;

  // White background
  doc.rect(x0, 0, HALF_W, SHEET_H).fill(C.white);

  // Corner decorations (alternate between leaf and flower)
  if (decoVariant % 2 === 0) {
    drawLeaf(doc, x0 + PAGE_M, PAGE_M + 2, 0.2);
    drawFlower(doc, x0 + HALF_W - PAGE_M - 16, SHEET_H - 40, 0.15);
  } else {
    drawFlower(doc, x0 + PAGE_M + 2, PAGE_M + 2, 0.2);
    drawLeaf(doc, x0 + HALF_W - PAGE_M - 14, SHEET_H - 42, 0.15, true);
  }

  // Illustration area with rounded frame
  const illX = x0 + PAGE_M;
  const illY = PAGE_M;
  const illW = BPC_W;

  if (imgBuf) {
    // Clip to rounded rect and draw image
    doc.save();
    roundedRect(doc, illX, illY, illW, ILL_H, ILL_R);
    doc.clip();
    doc.image(imgBuf, illX, illY, {
      width: illW,
      height: ILL_H,
      cover: [illW, ILL_H] as any,
    });
    doc.restore();

    // Subtle border around illustration
    doc.save();
    doc.strokeColor('#e0e0e0').lineWidth(0.5);
    roundedRect(doc, illX, illY, illW, ILL_H, ILL_R);
    doc.stroke();
    doc.restore();
  } else {
    // Placeholder gradient
    doc.save();
    roundedRect(doc, illX, illY, illW, ILL_H, ILL_R);
    doc.clip();
    const grad = (doc as any).linearGradient(illX, illY, illX + illW, illY + ILL_H);
    grad.stop(0, C.greenLight).stop(0.5, C.cream).stop(1, C.orangeLight);
    doc.rect(illX, illY, illW, ILL_H).fill(grad);
    doc.restore();
    // Placeholder label
    doc.font('Body').fontSize(fs.small).fillColor(C.brownMuted);
    doc.text(`Ilustracja: Scena ${pageNum}`, illX, illY + ILL_H / 2 - 6, {
      width: illW,
      align: 'center',
    });
  }

  // Text area
  if (text) {
    doc.font('Body').fontSize(fs.body).fillColor(C.brown);
    doc.text(text, x0 + PAGE_M + 4, TEXT_TOP, {
      width: BPC_W - 8,
      align: 'justify',
      lineGap: fs.lineGap,
    });
  }

  // Page number with footprint
  const footX = x0 + HALF_W / 2;
  const footY = SHEET_H - PAGE_M - 2;
  drawFootprint(doc, footX - 10, footY - 6, 0.35);
  doc.font('Body').fontSize(6.5).fillColor(C.brownMuted);
  doc.text(String(pageNum), footX, footY - 4, { width: 20, align: 'left' });
}

// ── Parent card (left half of sheet 5) ───────────────────
interface ParentOpts {
  draft: StoryDraft;
  profile: CharacterProfile;
  blueprint: StoryBlueprint | null;
  childName: string;
  fs: ReturnType<typeof getFontSize>;
}

function drawParentCard(doc: PDFKit.PDFDocument, opts: ParentOpts) {
  const { draft, profile, blueprint, childName, fs } = opts;
  const x0 = 0;
  const parentCard = draft.parentCard;

  // Warm cream background
  const grad = (doc as any).linearGradient(x0, 0, x0, SHEET_H);
  grad.stop(0, C.cream).stop(1, C.creamDark);
  doc.rect(x0, 0, HALF_W, SHEET_H).fill(grad);

  // Decorations
  drawLeaf(doc, x0 + HALF_W - PAGE_M - 14, SHEET_H - 35, 0.15, true);

  // Title
  let curY = PAGE_M + 8;
  doc.font('Title').fontSize(fs.title).fillColor(C.brown);
  doc.text('Dla Rodzica', x0 + PAGE_M, curY, {
    width: BPC_W,
    align: 'center',
  });
  curY = doc.y + 8;

  // Separator line
  const sepW = 60;
  doc.save();
  doc.strokeColor(C.orange).lineWidth(1.5);
  doc
    .moveTo(x0 + HALF_W / 2 - sepW / 2, curY)
    .lineTo(x0 + HALF_W / 2 + sepW / 2, curY)
    .stroke();
  doc.restore();
  curY += 10;

  // Intro text
  const introText =
    parentCard?.introPl ||
    `Ta bajka została stworzona specjalnie dla ${childName}. ` +
      'Poniżej znajdziesz pytania, które możesz zadać dziecku po przeczytaniu bajki, ' +
      'aby porozmawiać o uczuciach i doświadczeniach bohatera.';

  doc.font('Body').fontSize(fs.small).fillColor('#6d4c41');
  doc.text(introText, x0 + PAGE_M + 4, curY, {
    width: BPC_W - 8,
    lineGap: 3,
  });
  curY = doc.y + 10;

  // Questions
  let questions: string[];
  if (parentCard?.questions && parentCard.questions.length > 0) {
    questions = parentCard.questions;
  } else {
    const name = profile.childName || childName;
    questions = (blueprint?.beats || [])
      .filter((b) => b.therapeuticGoal)
      .slice(0, 4)
      .map(
        (b) =>
          `Jak myślisz, co czuł ${name} gdy ${(b.summaryPl || b.summary || '').toLowerCase().slice(0, 60)}?`,
      );
  }

  if (questions.length > 0) {
    doc
      .font('Title')
      .fontSize(fs.small + 1)
      .fillColor(C.brown);
    doc.text('Pytania do rozmowy:', x0 + PAGE_M + 4, curY, { width: BPC_W - 8 });
    curY = doc.y + 4;

    doc.font('Body').fontSize(fs.small).fillColor(C.brown);
    for (let i = 0; i < questions.length; i++) {
      doc.text(`${i + 1}. ${questions[i]}`, x0 + PAGE_M + 8, curY, {
        width: BPC_W - 16,
        lineGap: 2,
      });
      curY = doc.y + 3;
    }
  }

  // Activity
  if (parentCard?.activityPl) {
    curY = doc.y + 8;
    doc
      .font('Title')
      .fontSize(fs.small + 1)
      .fillColor(C.brown);
    doc.text('Aktywność:', x0 + PAGE_M + 4, curY, { width: BPC_W - 8 });
    curY = doc.y + 4;
    doc.font('Body').fontSize(fs.small).fillColor(C.brown);
    doc.text(parentCard.activityPl, x0 + PAGE_M + 8, curY, {
      width: BPC_W - 16,
      lineGap: 2,
    });
  }
}

// ── Back cover (right half of sheet 5) ───────────────────
interface BackOpts {
  childName: string;
  blurb: string;
  fs: ReturnType<typeof getFontSize>;
}

function drawBackCover(doc: PDFKit.PDFDocument, opts: BackOpts) {
  const { childName, blurb, fs } = opts;
  const x0 = HALF_W;

  // Green gradient background
  const grad = (doc as any).linearGradient(x0, 0, x0, SHEET_H);
  grad.stop(0, C.greenLight).stop(1, C.greenMid);
  doc.rect(x0, 0, HALF_W, SHEET_H).fill(grad);

  // Corner decorations
  drawLeaf(doc, x0 + PAGE_M, PAGE_M + 5, 0.25);
  drawLeaf(doc, x0 + HALF_W - PAGE_M - 14, PAGE_M + 5, 0.25, true);
  drawFlower(doc, x0 + PAGE_M + 5, SHEET_H - 60, 0.15);
  drawFlower(doc, x0 + HALF_W - PAGE_M - 20, SHEET_H - 60, 0.15);

  // Star
  drawStar(doc, x0 + HALF_W / 2 - 7, SHEET_H / 2 - 80, 0.5);

  // "Koniec" title
  doc
    .font('Title')
    .fontSize(fs.title + 6)
    .fillColor(C.brown);
  doc.text('Koniec', x0 + PAGE_M, SHEET_H / 2 - 50, {
    width: HALF_W - PAGE_M * 2,
    align: 'center',
  });

  // Blurb
  if (blurb) {
    doc.font('Body').fontSize(fs.small).fillColor('#5d4037');
    doc.text(blurb, x0 + PAGE_M + 20, doc.y + 8, {
      width: HALF_W - PAGE_M * 2 - 40,
      align: 'center',
      lineGap: 3,
    });
  }

  // "Stworzone z miłością"
  const loveY = blurb ? doc.y + 14 : SHEET_H / 2 + 10;
  doc
    .font('Body')
    .fontSize(fs.small + 1)
    .fillColor('#6d4c41');
  doc.text(`Stworzone z miłością dla ${childName}`, x0 + PAGE_M, loveY, {
    width: HALF_W - PAGE_M * 2,
    align: 'center',
  });

  // Hearts
  const heartsY = doc.y + 10;
  const hx = x0 + HALF_W / 2;
  drawHeart(doc, hx - 22, heartsY, 0.5);
  drawHeart(doc, hx - 6, heartsY, 0.5);
  drawHeart(doc, hx + 10, heartsY, 0.5);

  // Branding
  doc.font('Body').fontSize(6).fillColor(C.brownMuted);
  doc.text('bajkoterapia.org', x0 + PAGE_M, SHEET_H - PAGE_M - 10, {
    width: HALF_W - PAGE_M * 2,
    align: 'center',
  });
}

// ══════════════════════════════════════════════════════════
// DECORATIVE ELEMENTS (SVG-like paths via PDFKit)
// ══════════════════════════════════════════════════════════

function drawLeaf(doc: PDFKit.PDFDocument, x: number, y: number, opacity: number, flip = false) {
  doc.save();
  doc.opacity(opacity);
  if (flip) {
    doc.translate(x + 14, y);
    doc.scale(-1, 1);
    doc.translate(-x, -y);
  }
  // Leaf shape
  doc
    .path(
      `M${x + 7} ${y}C${x + 2} ${y + 4} ${x} ${y + 12} ${x} ${y + 17}c0 2 1.5 4 7 4s7-2 7-4c0-5-3-13-7-17z`,
    )
    .fill(C.greenLeaf);
  // Stem
  doc.save();
  doc.strokeColor('#4caf50').lineWidth(0.8);
  doc
    .moveTo(x + 7, y)
    .lineTo(x + 7, y + 20)
    .stroke();
  doc.restore();
  doc.restore();
  doc.opacity(1);
}

function drawFlower(doc: PDFKit.PDFDocument, x: number, y: number, opacity: number) {
  doc.save();
  doc.opacity(opacity);
  // Petals
  doc.circle(x + 7, y + 3, 3.5).fill(C.pink);
  doc.circle(x + 3, y + 9, 3.5).fill(C.pink);
  doc.circle(x + 11, y + 9, 3.5).fill(C.pink);
  // Center
  doc.circle(x + 7, y + 7, 2.5).fill('#fff176');
  doc.restore();
  doc.opacity(1);
}

function drawHeart(doc: PDFKit.PDFDocument, x: number, y: number, opacity: number) {
  doc.save();
  doc.opacity(opacity);
  doc
    .path(
      `M${x + 6} ${y + 12}` +
        `C${x + 6} ${y + 12} ${x} ${y + 8} ${x} ${y + 4.5}` +
        `C${x} ${y + 2} ${x + 2} ${y} ${x + 4} ${y}` +
        `C${x + 5.2} ${y} ${x + 6} ${y + 0.8} ${x + 6} ${y + 0.8}` +
        `C${x + 6} ${y + 0.8} ${x + 6.8} ${y} ${x + 8} ${y}` +
        `C${x + 10} ${y} ${x + 12} ${y + 2} ${x + 12} ${y + 4.5}` +
        `C${x + 12} ${y + 8} ${x + 6} ${y + 12} ${x + 6} ${y + 12}z`,
    )
    .fill(C.pink);
  doc.restore();
  doc.opacity(1);
}

function drawStar(doc: PDFKit.PDFDocument, x: number, y: number, opacity: number) {
  doc.save();
  doc.opacity(opacity);
  const cx = x + 9,
    cy = y + 9;
  const pts: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 72 - 90) * (Math.PI / 180);
    const innerAngle = (i * 72 + 36 - 90) * (Math.PI / 180);
    pts.push([cx + Math.cos(outerAngle) * 9, cy + Math.sin(outerAngle) * 9]);
    pts.push([cx + Math.cos(innerAngle) * 4, cy + Math.sin(innerAngle) * 4]);
  }
  let path = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) path += `L${pts[i][0]} ${pts[i][1]}`;
  path += 'z';
  doc.path(path).fill('#ffe082');
  doc.restore();
  doc.opacity(1);
}

function drawFootprint(doc: PDFKit.PDFDocument, x: number, y: number, opacity: number) {
  doc.save();
  doc.opacity(opacity);
  doc.strokeColor(C.brownLight).lineWidth(1.2).lineCap('round');
  doc
    .moveTo(x + 5, y)
    .lineTo(x + 5, y + 8)
    .stroke();
  doc
    .moveTo(x + 5, y + 8)
    .lineTo(x + 2, y + 11)
    .stroke();
  doc
    .moveTo(x + 5, y + 8)
    .lineTo(x + 8, y + 11)
    .stroke();
  doc.restore();
  doc.opacity(1);
}

function roundedRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  doc
    .moveTo(x + r, y)
    .lineTo(x + w - r, y)
    .quadraticCurveTo(x + w, y, x + w, y + r)
    .lineTo(x + w, y + h - r)
    .quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    .lineTo(x + r, y + h)
    .quadraticCurveTo(x, y + h, x, y + h - r)
    .lineTo(x, y + r)
    .quadraticCurveTo(x, y, x + r, y);
}

// ══════════════════════════════════════════════════════════
// FONT & IMAGE LOADING
// ══════════════════════════════════════════════════════════

async function fetchImageBuffer(ctx: ActionCtx, storageId: Id<'_storage'>): Promise<Buffer | null> {
  try {
    const url = await ctx.storage.getUrl(storageId);
    if (!url) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(new Uint8Array(await res.arrayBuffer()));
    return buf.length > 100 ? buf : null;
  } catch {
    return null;
  }
}

async function fetchFont(url: string): Promise<Buffer> {
  console.log(`[A9:PDF] Fetching font: ${url}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) {
    throw new Error(`Font fetch failed: ${url} - ${res.status}`);
  }
  const buf = Buffer.from(new Uint8Array(await res.arrayBuffer()));
  // Validate TTF magic bytes
  const magic = buf.length >= 4 ? buf.subarray(0, 4).toString('hex') : 'empty';
  const valid = magic === '00010000' || magic === '4f54544f';
  console.log(`[A9:PDF] Font: ${buf.length} bytes, magic=${magic}, valid=${valid}`);
  if (buf.length < 50_000) {
    throw new Error(`Font too small (${buf.length} bytes)`);
  }
  return buf;
}

async function loadFonts(): Promise<{ regular: Buffer; bold: Buffer }> {
  const [regular, bold] = await Promise.all([
    fetchFont(NOTO_SANS_URL),
    fetchFont(NOTO_SANS_BOLD_URL),
  ]);
  return { regular, bold };
}
