/**
 * Build the render service brief from an order. One PageSpec per sequence
 * entry, with `text` pre-resolved/split for kind=text. Typst handles
 * overflow natively, so we don't replicate `expandTextPages` from the pdfkit
 * composer (which measures heights and inserts extra pages).
 */
import type { Doc } from '../_generated/dataModel';
import { parseArtifact } from './bookTypes';
import type { ParentCard, StoryDraft, StoryBlueprint } from './bookTypes';
import { resolveAgeBracket } from './ageBracket';
import {
  buildPageSequence,
  charBudgetFor,
  splitBeatTextDynamic,
  type PageSpec as BajkotPageSpec,
} from './pageSequence';
import { dlaName } from './childNameInflect';

/**
 * Mirrors `drawParentCardPage` in bookComposer.ts: prefer A3 parentCard, fall
 * back to A2 blueprint fields when A3 didn't emit them. Without these
 * fallbacks the parent_card page renders empty for orders whose A3 prompt
 * skipped parentCard altogether.
 */
/**
 * LLM outputs occasionally violate the contracted shape — A2 has been seen
 * emitting parent_questions as `[{ question: "…" }, …]` instead of plain
 * strings. Normalize anything reasonable to a string array so the parent
 * card never renders "[object Object]".
 */
function normalizeQuestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed) out.push(trimmed);
      continue;
    }
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const candidate =
        (typeof obj.question === 'string' && obj.question) ||
        (typeof obj.q === 'string' && obj.q) ||
        (typeof obj.text === 'string' && obj.text) ||
        (typeof obj.pytanie === 'string' && obj.pytanie) ||
        '';
      const trimmed = String(candidate).trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
}

function formatParentCard(args: {
  parentCard: ParentCard | undefined | string;
  blueprint: StoryBlueprint | null;
  childName: string;
}): string {
  const { parentCard, blueprint, childName } = args;
  const pc = typeof parentCard === 'string' ? null : parentCard;
  if (typeof parentCard === 'string' && parentCard.trim()) return parentCard;

  const introDla = dlaName(childName);
  const introFallback = introDla
    ? `Ta bajka została stworzona ${introDla}. Poniżej znajdziesz pytania, które możesz zadać dziecku po wspólnym czytaniu.`
    : `Ta bajka jest spersonalizowana — jej bohaterem jest ${childName}. Poniżej znajdziesz pytania, które możesz zadać dziecku po wspólnym czytaniu.`;
  const intro = pc?.introPl?.trim() || introFallback;

  const blueprintAny = blueprint as
    | (Record<string, unknown> & { parentQuestions?: unknown; parent_questions?: unknown })
    | null;
  const blueprintQuestionsRaw =
    blueprintAny?.parentQuestions ?? blueprintAny?.parent_questions ?? [];
  const draftQuestions = normalizeQuestions(pc?.questions);
  const questions: string[] =
    draftQuestions.length > 0 ? draftQuestions : normalizeQuestions(blueprintQuestionsRaw);

  const takeawayAny = (blueprintAny?.actionableTakeaway ??
    (blueprintAny as Record<string, unknown> | null)?.actionable_takeaway) as
    | { howToPl?: string; how_to_pl?: string }
    | undefined;
  const activity = pc?.activityPl?.trim() || takeawayAny?.howToPl || takeawayAny?.how_to_pl || '';

  const parts: string[] = [];
  if (pc?.title) parts.push(pc.title);
  parts.push(intro);
  if (questions.length > 0) {
    parts.push('Pytania do rozmowy:');
    parts.push(questions.map((q, i) => `${i + 1}. ${q}`).join('\n'));
  }
  if (activity) {
    parts.push('Aktywność:');
    parts.push(activity);
  }
  return parts.join('\n\n');
}

export interface BriefIllustration {
  illustrationId: string;
  url: string;
}

export interface BriefPageSpec {
  pageNumber: number;
  kind: BajkotPageSpec['kind'];
  illustrationId?: string;
  beatId?: string;
  textPart?: number;
  textPartCount?: number;
  text?: string;
  /** Chapter title for kind=chapter_header. */
  title?: string;
}

export interface RenderBrief {
  jobId: string;
  mode: 'full' | 'preview';
  bracket: '3-5' | '6-8' | '9+';
  title: string;
  subtitle?: string;
  childName: string;
  dedication?: string;
  pages: BriefPageSpec[];
  illustrations: BriefIllustration[];
  outputKey: string;
  maxPages?: number;
  /** Bypass R2 cache lookup on the render service. */
  force?: boolean;
  /** DTP Lab opt-in features. Omitted = production layout. */
  experimental?: ExperimentalLayoutOptions;
}

export interface ExperimentalLayoutOptions {
  // Typography
  dropCaps?: boolean;
  widerMargins?: boolean;
  looseLineGap?: boolean;
  noPageNumbers?: boolean;
  // Color
  /** Hex color, e.g. '#4a6fa5'. Overrides accent color in Typst. */
  themeColor?: string;
  /** Hex bg color for title page (replaces default cream). */
  bgTitleOverride?: string;
  /** Unicode glyph for chapter ornaments — e.g. ❧, ✦, ◆. */
  ornament?: string;
  // Sequence
  singleBlankAfterCover?: boolean;
  removeKoniecSentinel?: boolean;
  chapterHeaders?: boolean;
  /** Map beatId → chapter title. Used when chapterHeaders=true. */
  chapterTitles?: Record<string, string>;
  /** Subtitle line under main title (e.g. 'Bajka o odwadze'). */
  categoryTagline?: string;
  // Imposition
  printFormat?: 'booklet' | 'single';
}

export interface BuildBriefInput {
  jobId: string;
  mode: 'full' | 'preview';
  order: Doc<'bookOrders'>;
  illustrations: Array<{ illustrationId: string; url: string }>;
  outputKey: string;
  maxPages?: number;
  force?: boolean;
  experimental?: ExperimentalLayoutOptions;
}

export function buildRenderBrief(input: BuildBriefInput): RenderBrief {
  const { order } = input;
  if (!order.storyDraft) throw new Error('order.storyDraft missing');
  const draft = parseArtifact<StoryDraft>(order.storyDraft, 'storyDraft');
  const blueprint = order.storyBlueprint
    ? parseArtifact<StoryBlueprint>(order.storyBlueprint, 'storyBlueprint')
    : null;

  const bracket = resolveAgeBracket(order);

  const beatTextById = new Map<string, string>();
  for (const page of draft.pages ?? []) {
    const key = page.beatId ?? String(page.beatNumber);
    if (key && !beatTextById.has(key)) beatTextById.set(key, page.text || '');
  }

  // First pass: split each beat into N parts according to the bracket budget.
  // The split feeds both the partsPerBeat hint to buildPageSequence (so the
  // sequence has enough text-page slots) and the per-page text resolver.
  const charBudget = charBudgetFor(bracket);
  const partsByBeatId = new Map<string, string[]>();
  const partsPerBeat = new Map<string, number>();
  for (const [beatId, text] of beatTextById) {
    const parts = splitBeatTextDynamic(text, charBudget);
    partsByBeatId.set(beatId, parts);
    partsPerBeat.set(beatId, parts.length);
  }

  const sequence = buildPageSequence(bracket, partsPerBeat, {
    singleBlankAfterCover: input.experimental?.singleBlankAfterCover,
    chapterHeaders: input.experimental?.chapterHeaders,
    chapterTitles: input.experimental?.chapterTitles,
  });

  const titleFallback = dlaName(order.childName)
    ? `Książeczka ${dlaName(order.childName)}`
    : 'Twoja bajka';
  const title = draft.title || blueprint?.title || titleFallback;
  const subtitle = blueprint?.subtitle || undefined;

  const dedication =
    (order.parentDedication as string | undefined)?.trim() || draft.dedication?.trim() || undefined;

  const briefPages: BriefPageSpec[] = sequence.map((spec) => {
    const out: BriefPageSpec = { pageNumber: spec.pageNumber, kind: spec.kind };
    if (spec.illustrationId) out.illustrationId = spec.illustrationId;
    if (spec.beatId) out.beatId = spec.beatId;
    if (spec.textPart) out.textPart = spec.textPart;
    if (spec.textPartCount) out.textPartCount = spec.textPartCount;
    if (spec.title) out.title = spec.title;

    if (spec.kind === 'text' && spec.beatId) {
      let text = '';
      const parts = partsByBeatId.get(spec.beatId);
      if (parts && spec.textPart) {
        text = parts[spec.textPart - 1] ?? '';
      } else {
        text = beatTextById.get(spec.beatId) ?? '';
      }

      // B6 last-page sentinel — applied to the FINAL part of beat 6 only.
      const isLastPart = spec.textPart === undefined || spec.textPart === (spec.textPartCount ?? 1);
      const skipKoniec = input.experimental?.removeKoniecSentinel === true;
      if (spec.beatId === '6' && isLastPart && !skipKoniec) {
        text = `${text}\n\n*Koniec*`;
      }
      out.text = text || `[brak tekstu dla beatu ${spec.beatId}]`;
    } else if (spec.kind === 'parent_card') {
      out.text = formatParentCard({
        parentCard: draft.parentCard,
        blueprint,
        childName: order.childName,
      });
    }

    return out;
  });

  const brief: RenderBrief = {
    jobId: input.jobId,
    mode: input.mode,
    bracket,
    title,
    childName: order.childName,
    pages: briefPages,
    illustrations: input.illustrations,
    outputKey: input.outputKey,
  };
  if (subtitle) brief.subtitle = subtitle;
  if (dedication) brief.dedication = dedication;
  if (input.maxPages) brief.maxPages = input.maxPages;
  if (input.force) brief.force = true;
  if (input.experimental) brief.experimental = input.experimental;
  return brief;
}
