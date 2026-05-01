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

function formatParentCard(pc: ParentCard | undefined | string): string {
  if (!pc) return '';
  if (typeof pc === 'string') return pc;
  const parts: string[] = [];
  if (pc.title) parts.push(pc.title);
  if (pc.introPl) parts.push(pc.introPl);
  if (pc.questions?.length) parts.push(pc.questions.map((q) => `• ${q}`).join('\n'));
  if (pc.activityPl) parts.push(pc.activityPl);
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
      out.text = formatParentCard(draft.parentCard);
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
