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
import { buildPageSequence, splitBeatText, type PageSpec as BajkotPageSpec } from './pageSequence';
import { dlaName } from './childNameInflect';

/**
 * Mirrors `drawParentCardPage` in bookComposer.ts: prefer A3 parentCard, fall
 * back to A2 blueprint fields when A3 didn't emit them. Without these
 * fallbacks the parent_card page renders empty for orders whose A3 prompt
 * skipped parentCard altogether.
 */
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
    | (Record<string, unknown> & { parentQuestions?: string[]; parent_questions?: string[] })
    | null;
  const blueprintQuestions = blueprintAny?.parentQuestions ?? blueprintAny?.parent_questions ?? [];
  const questions: string[] =
    pc?.questions && pc.questions.length > 0 ? pc.questions : blueprintQuestions;

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
  textPart?: 1 | 2;
  text?: string;
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
}

export interface BuildBriefInput {
  jobId: string;
  mode: 'full' | 'preview';
  order: Doc<'bookOrders'>;
  illustrations: Array<{ illustrationId: string; url: string }>;
  outputKey: string;
  maxPages?: number;
}

export function buildRenderBrief(input: BuildBriefInput): RenderBrief {
  const { order } = input;
  if (!order.storyDraft) throw new Error('order.storyDraft missing');
  const draft = parseArtifact<StoryDraft>(order.storyDraft, 'storyDraft');
  const blueprint = order.storyBlueprint
    ? parseArtifact<StoryBlueprint>(order.storyBlueprint, 'storyBlueprint')
    : null;

  const bracket = resolveAgeBracket(order);
  const sequence = buildPageSequence(bracket);

  const beatTextById = new Map<string, string>();
  for (const page of draft.pages ?? []) {
    const key = page.beatId ?? String(page.beatNumber);
    if (key && !beatTextById.has(key)) beatTextById.set(key, page.text || '');
  }

  const splitsByBeatId = new Map<string, [string, string]>();
  for (const p of sequence) {
    if (p.kind === 'text' && p.textPart && p.beatId && !splitsByBeatId.has(p.beatId)) {
      splitsByBeatId.set(p.beatId, splitBeatText(beatTextById.get(p.beatId) ?? ''));
    }
  }

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

    if (spec.kind === 'text' && spec.beatId) {
      let text = '';
      const split = splitsByBeatId.get(spec.beatId);
      if (split && spec.textPart) text = split[spec.textPart - 1] ?? '';
      else text = beatTextById.get(spec.beatId) ?? '';

      // B6 last-page sentinel — same as bookComposer.
      if (spec.beatId === '6' && (spec.textPart === undefined || spec.textPart === 2)) {
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
  return brief;
}
