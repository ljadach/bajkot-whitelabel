'use node';

/**
 * A9 — Book Composer (PDF generation)
 *
 * 2026-04-16 refactor: deterministic portrait 210x210mm square pages per age.
 *  - 3-5: 24 pages (includes mood_opening + mood_closing)
 *  - 6-8: 27 pages (mood_closing only; adds beat 4a)
 *  - 9+:  31 pages (adds beat 4b)
 *
 * The page sequence is driven by `buildPageSequence(bracket)` and pairs each
 * scene/mood illustration with a full-bleed image page. Text pages hold the
 * beat prose; double-illustration beats (1, 4, 4a, 4b, 5) split their text
 * across two text pages at a natural paragraph break (via `splitBeatText`).
 *
 * Pages are rendered one at a time — no more 2-up sheet folding.
 */

import { internalAction, type ActionCtx } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { parseArtifact } from './lib/bookTypes';
import type { StoryDraft, StoryBlueprint, CharacterProfile } from './lib/bookTypes';
import type { Id } from './_generated/dataModel';
import { getNarrative } from './bookPipelineEvents';
import { getCurrentTraceId } from './lib/langfuse';
import { resolveAgeBracket, type AgeBracket } from './lib/ageBracket';
import { buildPageSequence, splitBeatText, type PageSpec } from './lib/pageSequence';
import PDFDocument from 'pdfkit';

// Patch initFonts — Convex runtime has no Helvetica.afm files
PDFDocument.prototype.initFonts = function (this: any) {
  this._fontFamilies = {};
  this._fontCount = 0;
  this._fontSize = 12;
  this._font = null;
  this._registeredFonts = {};
};

// ── Dimensions ──────────────────────────────────────────
// Square 210x210mm = ~595.28pt (matches the A9 spec).
const PAGE_W = 595.28;
const PAGE_H = 595.28;
const MARGIN = 32; // ~11mm safe margin inside trim

// ── Colors ──────────────────────────────────────────────
const C = {
  bgPage: '#FFFBF5',
  bgTitle: '#FFF8E1',
  bgParent: '#FFF3E0',
  bgColophon: '#FAFAFA',
  textPrimary: '#2D2D2D',
  textSecondary: '#6B6B6B',
  accent: '#E65100',
  brown: '#4e342e',
  brownMuted: '#bcaaa4',
};

const NOTO_SANS_URL =
  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSans/full/ttf/NotoSans-Regular.ttf';
const NOTO_SANS_BOLD_URL =
  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSans/full/ttf/NotoSans-Bold.ttf';

const COLOPHON_DISCLAIMER =
  'Ta bajka została wygenerowana przy pomocy sztucznej inteligencji ' +
  'i spersonalizowana dla Twojego dziecka. Zalecamy, aby rodzic ' +
  'przeczytał bajkę przed pokazaniem jej dziecku. Bajka ma charakter ' +
  'psychoedukacyjny i nie zastępuje konsultacji ze specjalistą.';

// ── Font sizes per age bracket ──────────────────────────
function fontSizesFor(bracket: AgeBracket) {
  switch (bracket) {
    case '3-5':
      return { body: 20, title: 34, small: 11, lineGap: 8 };
    case '6-8':
      return { body: 16, title: 30, small: 10, lineGap: 6 };
    case '9+':
      return { body: 13, title: 28, small: 10, lineGap: 5 };
  }
}

// ── Main action ─────────────────────────────────────────

export const generatePdf = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    const log = (msg: string, data?: Record<string, unknown>) => {
      console.log(`[A9:PDF] ${msg}`, data ? JSON.stringify(data) : '');
    };

    try {
      log('Starting PDF generation (portrait square, deterministic sequence)', { orderId });

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order?.storyDraft || !order?.characterProfile) {
        throw new Error('Missing story draft or character profile');
      }

      const draft = parseArtifact<StoryDraft>(order.storyDraft, 'storyDraft');
      const profile = parseArtifact<CharacterProfile>(order.characterProfile, 'characterProfile');
      const blueprint = order.storyBlueprint
        ? parseArtifact<StoryBlueprint>(order.storyBlueprint, 'storyBlueprint')
        : null;

      const bracket = resolveAgeBracket(order);
      const pageSequence = buildPageSequence(bracket);
      const fs = fontSizesFor(bracket);

      const illustrations = await ctx.runQuery(internal.bookPipelineHelpers.getIllustrations, {
        orderId,
      });
      log('Data loaded', {
        bracket,
        pages: pageSequence.length,
        illustrations: illustrations.length,
        beats: draft.pages?.length,
      });

      const { regular, bold } = await loadFonts();

      const doc = new PDFDocument({
        size: [PAGE_W, PAGE_H],
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

      // Index beat text by beatId for fast lookup
      const beatTextById = new Map<string, string>();
      for (const page of draft.pages) {
        const key = page.beatId ?? String(page.beatNumber);
        if (key && !beatTextById.has(key)) {
          beatTextById.set(key, page.text || '');
        }
      }

      // Only beats rendered via textPart need splitting. Compute on first read.
      const beatsNeedingSplit = new Set<string>();
      for (const p of pageSequence) {
        if (p.kind === 'text' && p.textPart && p.beatId) beatsNeedingSplit.add(p.beatId);
      }
      const beatTextPartsById = new Map<string, [string, string]>();
      for (const beatId of beatsNeedingSplit) {
        beatTextPartsById.set(beatId, splitBeatText(beatTextById.get(beatId) ?? ''));
      }

      const illsById = new Map<string, (typeof illustrations)[number]>(
        illustrations.map((i: any) => [i.illustrationId as string, i] as const),
      );
      const getIllBuf = async (id: string): Promise<Buffer | null> => {
        const ill = illsById.get(id);
        if (!ill) return null;
        return fetchImageBuffer(ctx, ill.storageId);
      };

      const title = draft.title || blueprint?.title || `Książeczka dla ${order.childName}`;
      const subtitle = blueprint?.subtitle || '';
      const dedication =
        (order.parentDedication as string | undefined)?.trim() ||
        draft.dedication?.trim() ||
        `Dla ${order.childName}`;

      const renderCtx: RenderCtx = {
        fs,
        bracket,
        title,
        subtitle,
        childName: order.childName,
        dedication,
        beatTextById,
        beatTextPartsById,
        draft,
        blueprint,
        profile,
        getIllBuf,
      };

      // Pre-paginate text — when a beat's prose doesn't fit on its allotted
      // text page, split into multiple text pages BEFORE rendering. Keeps the
      // illustration ordering intact (extra text pages are inserted between
      // the original text page and the next sequence item).
      const expandedSequence = expandTextPages(doc, pageSequence, renderCtx);
      log('Page sequence expanded', {
        before: pageSequence.length,
        after: expandedSequence.length,
      });

      for (const spec of expandedSequence) {
        doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 });
        await renderPage(doc, spec, renderCtx);
      }

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
        traceId: getCurrentTraceId(),
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
        traceId: getCurrentTraceId(),
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

// ════════════════════════════════════════════════════════
// Page rendering
// ════════════════════════════════════════════════════════

interface RenderCtx {
  fs: ReturnType<typeof fontSizesFor>;
  bracket: AgeBracket;
  title: string;
  subtitle: string;
  childName: string;
  dedication: string;
  beatTextById: Map<string, string>;
  beatTextPartsById: Map<string, [string, string]>;
  draft: StoryDraft;
  blueprint: StoryBlueprint | null;
  profile: CharacterProfile;
  getIllBuf: (id: string) => Promise<Buffer | null>;
}

async function renderPage(doc: PDFKit.PDFDocument, spec: PageSpec, r: RenderCtx): Promise<void> {
  switch (spec.kind) {
    case 'cover':
      await drawCoverPage(doc, r);
      return;
    case 'title':
      drawTitlePage(doc, r);
      return;
    case 'mood_opening':
    case 'mood_closing':
      await drawFullBleedImage(doc, spec.illustrationId!, r);
      return;
    case 'illustration':
      await drawFullBleedImage(doc, spec.illustrationId!, r);
      return;
    case 'text':
      drawTextPage(doc, spec, r);
      return;
    case 'parent_card':
      drawParentCardPage(doc, r);
      return;
    case 'colophon':
      drawColophonPage(doc, r);
      return;
  }
}

async function drawCoverPage(doc: PDFKit.PDFDocument, r: RenderCtx) {
  const coverBuf = await r.getIllBuf('cover');
  if (coverBuf) {
    doc.save();
    doc.rect(0, 0, PAGE_W, PAGE_H).clip();
    doc.image(coverBuf, 0, 0, { width: PAGE_W, height: PAGE_H, cover: [PAGE_W, PAGE_H] as any });
    doc.restore();

    // Soft white gradient at bottom 40% for title legibility
    const gradStart = PAGE_H * 0.6;
    const steps = 30;
    for (let i = 0; i < steps; i++) {
      const y = gradStart + ((PAGE_H - gradStart) / steps) * i;
      const alpha = (i / steps) * 0.9;
      doc.save();
      doc.opacity(alpha);
      doc.rect(0, y, PAGE_W, (PAGE_H - gradStart) / steps + 1).fill('#FFFFFF');
      doc.restore();
    }
    doc.opacity(1);
  } else {
    // Fallback cream background
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.bgTitle);
  }

  // Title block near bottom
  doc.font('Title').fontSize(r.fs.title).fillColor(C.brown);
  doc.text(r.title, MARGIN, PAGE_H - 140, {
    width: PAGE_W - MARGIN * 2,
    align: 'center',
  });

  if (r.subtitle) {
    doc
      .font('Body')
      .fontSize(r.fs.small + 1)
      .fillColor(C.brownMuted);
    doc.text(r.subtitle, MARGIN, doc.y + 4, {
      width: PAGE_W - MARGIN * 2,
      align: 'center',
    });
  }
}

function drawTitlePage(doc: PDFKit.PDFDocument, r: RenderCtx) {
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.bgTitle);

  const centerX = PAGE_W / 2;
  const centerY = PAGE_H / 2;

  doc
    .font('Title')
    .fontSize(r.fs.title + 2)
    .fillColor(C.brown);
  doc.text(r.title, MARGIN, centerY - 100, {
    width: PAGE_W - MARGIN * 2,
    align: 'center',
  });

  if (r.subtitle) {
    doc
      .font('Body')
      .fontSize(r.fs.small + 2)
      .fillColor(C.brownMuted);
    doc.text(r.subtitle, MARGIN, doc.y + 6, {
      width: PAGE_W - MARGIN * 2,
      align: 'center',
    });
  }

  doc.font('Body').fontSize(r.fs.small).fillColor(C.textSecondary);
  doc.text(`Bajka dla ${r.childName}`, MARGIN, doc.y + 20, {
    width: PAGE_W - MARGIN * 2,
    align: 'center',
  });

  // Dedication box further down
  const dedY = centerY + 40;
  doc
    .font('Body')
    .fontSize(r.fs.small + 1)
    .fillColor(C.textPrimary);
  doc.text(r.dedication, MARGIN + 30, dedY, {
    width: PAGE_W - (MARGIN + 30) * 2,
    align: 'center',
    lineGap: 3,
    characterSpacing: 0.2,
  });
  // Tiny heart beneath
  const heartY = doc.y + 14;
  doc.save();
  doc.opacity(0.5);
  doc
    .path(
      `M${centerX - 6} ${heartY + 12}` +
        `C${centerX - 6} ${heartY + 12} ${centerX - 12} ${heartY + 8} ${centerX - 12} ${heartY + 4.5}` +
        `C${centerX - 12} ${heartY + 2} ${centerX - 10} ${heartY} ${centerX - 8} ${heartY}` +
        `C${centerX - 6.8} ${heartY} ${centerX - 6} ${heartY + 0.8} ${centerX - 6} ${heartY + 0.8}` +
        `C${centerX - 6} ${heartY + 0.8} ${centerX - 5.2} ${heartY} ${centerX - 4} ${heartY}` +
        `C${centerX - 2} ${heartY} ${centerX} ${heartY + 2} ${centerX} ${heartY + 4.5}` +
        `C${centerX} ${heartY + 8} ${centerX - 6} ${heartY + 12} ${centerX - 6} ${heartY + 12}z`,
    )
    .fill('#EF9A9A');
  doc.restore();
  doc.opacity(1);
}

async function drawFullBleedImage(doc: PDFKit.PDFDocument, illustrationId: string, r: RenderCtx) {
  const buf = await r.getIllBuf(illustrationId);
  if (buf) {
    doc.save();
    doc.rect(0, 0, PAGE_W, PAGE_H).clip();
    doc.image(buf, 0, 0, { width: PAGE_W, height: PAGE_H, cover: [PAGE_W, PAGE_H] as any });
    doc.restore();
  } else {
    // Placeholder — gentle gradient with id label
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.bgPage);
    doc.font('Body').fontSize(r.fs.small).fillColor(C.textSecondary);
    doc.text(`Ilustracja: ${illustrationId}`, 0, PAGE_H / 2 - 6, {
      width: PAGE_W,
      align: 'center',
    });
  }
}

/**
 * Width and height of the text box used by `drawTextPage`. Kept as constants
 * so `expandTextPages` (pre-pagination) measures against the same dimensions
 * the renderer uses.
 */
const TEXT_BOX_X = MARGIN;
const TEXT_BOX_Y = MARGIN + 20;
const TEXT_BOX_W = PAGE_W - MARGIN * 2;
const TEXT_BOX_H = PAGE_H - (MARGIN + 20) - 24;

type ResolvedPageSpec = PageSpec & { textOverride?: string };

function resolveBeatText(spec: PageSpec, r: RenderCtx): string {
  const beatId = spec.beatId;
  if (!beatId) return '';
  if (spec.textPart === 1 || spec.textPart === 2) {
    const parts = r.beatTextPartsById.get(beatId);
    if (parts) return spec.textPart === 1 ? parts[0] : parts[1];
    return '';
  }
  return r.beatTextById.get(beatId) || '';
}

/**
 * Greedy word-by-word pagination: walk the text and flush a chunk whenever
 * adding the next word would overflow `maxHeight`. Single oversized words
 * are emitted as their own chunk (overflow visible — better than dropping
 * content silently).
 */
function paginateTextToChunks(
  doc: PDFKit.PDFDocument,
  text: string,
  fontSize: number,
  lineGap: number,
  maxHeight: number,
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [trimmed];

  doc.font('Body').fontSize(fontSize);
  const measureOpts = { width: TEXT_BOX_W, lineGap, align: 'justify' as const };

  if (doc.heightOfString(trimmed, measureOpts) <= maxHeight) {
    return [trimmed];
  }

  // Tokenize while preserving whitespace so newlines/paragraph breaks survive.
  const tokens = trimmed.split(/(\s+)/);
  const chunks: string[] = [];
  let current = '';

  for (const tok of tokens) {
    const candidate = current + tok;
    const h = doc.heightOfString(candidate, measureOpts);
    if (h > maxHeight && current.trim().length > 0) {
      chunks.push(current.trim());
      current = tok.replace(/^\s+/, ''); // drop leading whitespace on a new chunk
    } else {
      current = candidate;
    }
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [trimmed];
}

/**
 * Expand the deterministic page sequence so any text page whose prose
 * overflows its box is split into N consecutive text pages. Inserts the
 * extras immediately after the original — illustration ordering is
 * preserved. Page numbers are renumbered after expansion.
 */
function expandTextPages(
  doc: PDFKit.PDFDocument,
  sequence: PageSpec[],
  r: RenderCtx,
): ResolvedPageSpec[] {
  const out: ResolvedPageSpec[] = [];
  for (const spec of sequence) {
    if (spec.kind !== 'text') {
      out.push(spec);
      continue;
    }
    let text = resolveBeatText(spec, r);
    if (!text.trim()) text = `[brak tekstu dla beatu ${spec.beatId}]`;
    if (spec.beatId === '6' && (spec.textPart === undefined || spec.textPart === 2)) {
      text = `${text}\n\n*Koniec*`;
    }
    const chunks = paginateTextToChunks(doc, text, r.fs.body, r.fs.lineGap, TEXT_BOX_H);
    for (const chunk of chunks) {
      out.push({ ...spec, textOverride: chunk });
    }
  }
  // Renumber so page-number badges stay consecutive after expansion.
  return out.map((spec, i) => ({ ...spec, pageNumber: i + 1 }));
}

function drawTextPage(doc: PDFKit.PDFDocument, spec: ResolvedPageSpec, r: RenderCtx) {
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.bgPage);

  // Pre-paginated by `expandTextPages` — the chunk for this page is in
  // `textOverride`. Fall back to the legacy lookup only if expansion was
  // skipped (e.g. tests that bypass the pre-pagination step).
  let text = spec.textOverride;
  if (text === undefined) {
    text = resolveBeatText(spec, r);
    if (!text.trim()) text = `[brak tekstu dla beatu ${spec.beatId}]`;
    if (spec.beatId === '6' && (spec.textPart === undefined || spec.textPart === 2)) {
      text = `${text}\n\n*Koniec*`;
    }
  }

  doc.font('Body').fontSize(r.fs.body).fillColor(C.textPrimary);
  doc.text(text, TEXT_BOX_X, TEXT_BOX_Y, {
    width: TEXT_BOX_W,
    height: TEXT_BOX_H,
    align: 'justify',
    lineGap: r.fs.lineGap,
  });

  // Page number at bottom center
  doc
    .font('Body')
    .fontSize(r.fs.small - 1)
    .fillColor(C.brownMuted);
  doc.text(String(spec.pageNumber), MARGIN, PAGE_H - MARGIN + 4, {
    width: PAGE_W - MARGIN * 2,
    height: 14,
    align: 'center',
    lineBreak: false,
  });
}

function drawParentCardPage(doc: PDFKit.PDFDocument, r: RenderCtx) {
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.bgParent);

  let y = MARGIN + 10;
  doc
    .font('Title')
    .fontSize(r.fs.title - 4)
    .fillColor(C.brown);
  doc.text('Dla Rodzica', MARGIN, y, { width: PAGE_W - MARGIN * 2, align: 'center' });
  y = doc.y + 8;

  // Decorative separator
  doc.save();
  doc.strokeColor(C.accent).lineWidth(1.5);
  doc
    .moveTo(PAGE_W / 2 - 30, y)
    .lineTo(PAGE_W / 2 + 30, y)
    .stroke();
  doc.restore();
  y += 14;

  const parentCard = r.draft.parentCard;
  const intro =
    parentCard?.introPl ||
    `Ta bajka została stworzona dla ${r.childName}. ` +
      'Poniżej znajdziesz pytania, które możesz zadać dziecku po wspólnym czytaniu.';
  doc
    .font('Body')
    .fontSize(r.fs.small + 1)
    .fillColor(C.textPrimary);
  doc.text(intro, MARGIN + 4, y, {
    width: PAGE_W - (MARGIN + 4) * 2,
    height: Math.max(0, PAGE_H - y - MARGIN - 20),
    lineGap: 3,
    ellipsis: true,
  });
  y = doc.y + 14;

  // Questions (prefer A3 parentCard, fall back to A2 parent_questions).
  // The A2 prompt asks for snake_case `parent_questions`, so the blueprint
  // JSON often lands in that shape — read both keys to avoid an empty card.
  const blueprintAny = r.blueprint as
    | (Record<string, unknown> & { parentQuestions?: string[]; parent_questions?: string[] })
    | null;
  const blueprintQuestions = blueprintAny?.parentQuestions ?? blueprintAny?.parent_questions ?? [];
  const questions: string[] =
    parentCard?.questions && parentCard.questions.length > 0
      ? parentCard.questions
      : blueprintQuestions;

  if (questions.length > 0) {
    doc
      .font('Title')
      .fontSize(r.fs.small + 2)
      .fillColor(C.brown);
    doc.text('Pytania do rozmowy:', MARGIN + 4, y, { width: PAGE_W - MARGIN * 2 });
    y = doc.y + 6;
    doc
      .font('Body')
      .fontSize(r.fs.small + 1)
      .fillColor(C.textPrimary);
    for (let i = 0; i < questions.length; i++) {
      const availH = Math.max(0, PAGE_H - y - MARGIN - 20);
      if (availH < 20) break; // run out of room
      doc.text(`${i + 1}. ${questions[i]}`, MARGIN + 8, y, {
        width: PAGE_W - (MARGIN + 8) * 2,
        height: availH,
        lineGap: 2,
        ellipsis: true,
      });
      y = doc.y + 4;
    }
  }

  // Activity — prefer A3, fall back to A2 actionable_takeaway.how_to_pl.
  // Same snake_case-aware read as parent questions above.
  const takeawayAny = (blueprintAny?.actionableTakeaway ??
    (blueprintAny as Record<string, unknown> | null)?.actionable_takeaway) as
    | { howToPl?: string; how_to_pl?: string }
    | undefined;
  const activity = parentCard?.activityPl || takeawayAny?.howToPl || takeawayAny?.how_to_pl || '';
  if (activity) {
    y = doc.y + 10;
    doc
      .font('Title')
      .fontSize(r.fs.small + 2)
      .fillColor(C.brown);
    doc.text('Aktywność:', MARGIN + 4, y, { width: PAGE_W - MARGIN * 2 });
    y = doc.y + 6;
    doc
      .font('Body')
      .fontSize(r.fs.small + 1)
      .fillColor(C.textPrimary);
    doc.text(activity, MARGIN + 8, y, {
      width: PAGE_W - (MARGIN + 8) * 2,
      height: Math.max(0, PAGE_H - y - MARGIN),
      lineGap: 2,
      ellipsis: true,
    });
  }
}

function drawColophonPage(doc: PDFKit.PDFDocument, r: RenderCtx) {
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.bgColophon);

  const centerY = PAGE_H / 2;

  doc
    .font('Title')
    .fontSize(r.fs.small + 4)
    .fillColor(C.brown);
  doc.text('Koniec', MARGIN, centerY - 80, {
    width: PAGE_W - MARGIN * 2,
    align: 'center',
  });

  doc.font('Body').fontSize(r.fs.small).fillColor(C.textPrimary);
  doc.text(COLOPHON_DISCLAIMER, MARGIN + 30, centerY - 40, {
    width: PAGE_W - (MARGIN + 30) * 2,
    align: 'center',
    lineGap: 4,
  });

  doc
    .font('Body')
    .fontSize(r.fs.small - 1)
    .fillColor(C.textSecondary);
  doc.text(`Stworzone z miłością dla ${r.childName}.`, MARGIN, doc.y + 20, {
    width: PAGE_W - MARGIN * 2,
    align: 'center',
  });

  doc
    .font('Body')
    .fontSize(r.fs.small - 2)
    .fillColor(C.brownMuted);
  doc.text('bajkoterapia.org', MARGIN, PAGE_H - MARGIN - 10, {
    width: PAGE_W - MARGIN * 2,
    align: 'center',
  });
}

// ════════════════════════════════════════════════════════
// Font & image loading
// ════════════════════════════════════════════════════════

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
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) {
    throw new Error(`Font fetch failed: ${url} - ${res.status}`);
  }
  const buf = Buffer.from(new Uint8Array(await res.arrayBuffer()));
  if (buf.length < 50_000) {
    throw new Error(`Font too small (${buf.length} bytes)`);
  }
  return buf;
}

// Cache TTFs across invocations in the same Convex container — a warm instance
// reuses them across many PDFs, saving ~800ms and 1-2 MB of downloads per call.
let fontCache: { regular: Buffer; bold: Buffer } | null = null;

async function loadFonts(): Promise<{ regular: Buffer; bold: Buffer }> {
  if (fontCache) return fontCache;
  const [regular, bold] = await Promise.all([
    fetchFont(NOTO_SANS_URL),
    fetchFont(NOTO_SANS_BOLD_URL),
  ]);
  fontCache = { regular, bold };
  return fontCache;
}
