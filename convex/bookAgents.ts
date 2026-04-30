'use node';

/**
 * Book pipeline agents (A0–A11) — all internalAction handlers.
 *
 * Each agent:
 * 1. Reads current order via internal query
 * 2. Does its work (LLM call, image gen, or pure code)
 * 3. Writes result to bookOrders via internal mutation
 * 4. Schedules next agent via ctx.scheduler.runAfter(0, ...)
 */

import { internalAction, type ActionCtx } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { chatJsonForStage, chatJsonForStageWithImages } from './lib/llmClient';
import { applyPlaceholders, PromptTemplate } from './lib/prompts';
import { normalizeFallback } from './lib/prompts/types';
import { bookFallbacks } from './lib/prompts/bookFallbacks';
import { startActiveObservation, getCurrentTraceId } from './lib/langfuse';
import { buildInternalLogContext } from './lib/actionHelpers';
import { generateImage, IMAGE_GEN_MIN_INTERVAL_MS } from './lib/geminiImageGen';
import { asciiPlaceholderPng } from './lib/asciiToImage';
import {
  PROBLEMS,
  HAIR_COLOR_MAP,
  HAIR_STYLE_MAP,
  EYE_COLOR_MAP,
  SKIN_TONE_MAP,
  OUTFIT_MAP,
  STYLE_A,
  STYLE_B,
  resolveProblemId,
} from './lib/bookData';
import {
  parseArtifact,
  type NormalizedOrder,
  type CharacterProfile,
  type StoryBlueprint,
  type StoryDraft,
  type PsychReview,
  type IllustrationPlan,
  type VisualQa,
  type FinalQa,
} from './lib/bookTypes';
import { applyCorrections, IMAGE_SAFETY_SUFFIX } from './lib/bookAgentUtils';
import { normalizeStoryDraftV2, normalizeIllustrationPlan } from './lib/bookAgentUtilsV2';
import { resolveAgeBracket } from './lib/ageBracket';
import { buildChildPortrait } from './lib/childPortrait';
import { getNarrative } from './bookPipelineEvents';

/**
 * Record a pipeline event with the current Langfuse trace ID auto-attached.
 * Lets admin debugging join `bookPipelineEvents` rows ↔ `llmLogs` rows ↔
 * Langfuse traces by a single ID without every callsite remembering to do it.
 */
async function recordPipelineEvent(
  ctx: ActionCtx,
  args: {
    orderId: any;
    agent: string;
    event: 'start' | 'complete' | 'error' | 'retry' | 'info';
    narrative: string;
    details?: string;
    traceId?: string;
  },
): Promise<void> {
  await ctx.runMutation(internal.bookPipelineEvents.recordEvent, {
    ...args,
    traceId: args.traceId ?? getCurrentTraceId(),
  });
}

/**
 * Increment LLM call counter and abort if budget exceeded.
 * Call this before every LLM or image generation call.
 */
async function checkCallBudget(ctx: ActionCtx, orderId: any): Promise<void> {
  const { exceeded, count } = await ctx.runMutation(
    internal.bookPipelineHelpers.incrementLlmCallCount,
    { orderId },
  );
  if (exceeded) {
    throw new Error(
      `Order LLM call budget exceeded (${count} calls). Pipeline stopped to prevent runaway costs.`,
    );
  }
}

/**
 * Load prompt from DB and apply placeholders.
 * Throws if prompt not found — run seedPrompts first.
 */
async function getPrompt(
  ctx: ActionCtx,
  template: PromptTemplate,
  params: Record<string, string>,
): Promise<string> {
  const content = await ctx.runQuery(internal.admin.bookPrompts.getPrompt, {
    templateKey: template,
  });
  if (!content) {
    // Runtime fallback to seed values if DB is empty (e.g. fresh deployment)
    const fallbackConfig = bookFallbacks[template];
    if (fallbackConfig?.fallback) {
      console.warn(`[getPrompt] Using fallback for ${template} — DB prompt missing`);
      return applyPlaceholders(normalizeFallback(fallbackConfig.fallback), params, template);
    }
    throw new Error(`Prompt not found in DB or fallbacks for template: ${template}.`);
  }
  return applyPlaceholders(content, params, template);
}

// ════════════════════════════════════════════════════════════
// A0 — Intake (Code only, no LLM)
// ════════════════════════════════════════════════════════════

export const intake = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    try {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'intake',
        currentAgent: 'A0',
      });
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A0',
        event: 'start',
        narrative: getNarrative('A0', 'start'),
      });

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order) throw new Error('Order not found');

      // Resolve problemId via aliases. Unknown ids fall back to
      // `general_resilience` so the pipeline doesn't reject custom
      // problems written by parents via "Inny problem?" — the user's
      // problemDetail still drives the actual story.
      const canonicalProblemId = resolveProblemId(order.problemId);
      const problem = PROBLEMS[canonicalProblemId] ?? PROBLEMS.general_resilience;

      // Appearance maps fall through to a sensible default if the user
      // submits an unrecognized value (e.g. an old slug or a typo).
      const hairColorEn = HAIR_COLOR_MAP[order.hairColor] ?? order.hairColor;
      const hairStyleEn = HAIR_STYLE_MAP[order.hairStyle] ?? order.hairStyle;
      const eyeColorEn = EYE_COLOR_MAP[order.eyeColor] ?? order.eyeColor;

      // Spec § 3.4 dropped skin tone from intake. Default to 'jasna'
      // for both undefined and unrecognized values.
      const skinToneKey =
        order.skinTone && SKIN_TONE_MAP[order.skinTone] ? order.skinTone : 'jasna';

      // Outfit is a free-text field — pass through when not in the preset
      // map so user input ("czerwona sukienka w kropki") drives the
      // illustration prompt directly.
      const outfit = OUTFIT_MAP[order.outfit] ?? {
        pl: order.outfit,
        en: order.outfit,
      };

      // Build normalized order data
      const normalized: NormalizedOrder = {
        childName: order.childName,
        ageBracket: order.ageBracket,
        gender: order.gender,
        problemId: order.problemId,
        problemTitle: problem.title_pl,
        problemContext: problem.context_pl,
        problemMetaphor: problem.metaphor_pl,
        problemCategory: problem.category,
        problemDetail: order.problemDetail,
        favoriteToy: order.favoriteToy,
        glasses: order.glasses,
        hairColor: order.hairColor,
        hairColorEn,
        hairStyle: order.hairStyle,
        hairStyleEn,
        eyeColor: order.eyeColor,
        eyeColorEn,
        skinTone: skinToneKey,
        skinToneEn: SKIN_TONE_MAP[skinToneKey],
        outfit: order.outfit,
        outfitPl: outfit.pl,
        outfitEn: outfit.en,
      };

      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderArtifact, {
        orderId,
        field: 'orderData',
        value: JSON.stringify(normalized),
      });

      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A0',
        event: 'complete',
        narrative: getNarrative('A0', 'complete'),
      });

      // Schedule A1
      await ctx.scheduler.runAfter(0, internal.bookAgents.profileChild, { orderId });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A0',
        event: 'error',
        narrative: getNarrative('A0', 'error', errMsg),
        details: errMsg,
      });
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A0',
        error: errMsg,
      });
    }
    return null;
  },
});

// ════════════════════════════════════════════════════════════
// A1 — Child Profiler (LLM)
// ════════════════════════════════════════════════════════════

export const profileChild = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    try {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'profiling',
        currentAgent: 'A1',
      });
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A1',
        event: 'start',
        narrative: getNarrative('A1', 'start'),
      });

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order?.orderData) throw new Error('Order data not found');

      const logContext = buildInternalLogContext(ctx, order.clerkUserId);

      const profile = await startActiveObservation(
        'bookAgent.profileChild',
        async (span) => {
          span.update({ orderId, agent: 'A1' });

          const artStyleSpec = `style: "${STYLE_A.style}"\nmodifiers: "${STYLE_A.modifiers}"`;

          const systemPrompt = await getPrompt(ctx, PromptTemplate.BookChildProfiler, {
            ORDER_JSON: order.orderData!,
            ART_STYLE_SPEC: artStyleSpec,
          });

          await checkCallBudget(ctx, orderId);
          return await chatJsonForStage<CharacterProfile>(
            'book.profiling',
            {
              system: systemPrompt,
              user: 'Generate the character profile for this order. Return ONLY valid JSON.',
            },
            undefined,
            logContext,
          );
        },
        { asType: 'span' },
      );

      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderArtifact, {
        orderId,
        field: 'characterProfile',
        value: JSON.stringify(profile),
      });

      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A1',
        event: 'complete',
        narrative: getNarrative('A1', 'complete'),
      });

      // Fork: schedule both story track (A2) and image track (A6) in parallel
      await ctx.scheduler.runAfter(0, internal.bookAgents.planStory, { orderId });
      await ctx.scheduler.runAfter(0, internal.bookAgents.designCharacter, { orderId });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A1',
        event: 'error',
        narrative: getNarrative('A1', 'error', errMsg),
        details: errMsg,
      });
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A1',
        error: errMsg,
      });
    }
    return null;
  },
});

// ════════════════════════════════════════════════════════════
// A2 — Story Architect (LLM)
// ════════════════════════════════════════════════════════════

export const planStory = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    try {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'story_planning',
        currentAgent: 'A2',
      });
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A2',
        event: 'start',
        narrative: getNarrative('A2', 'start'),
      });

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order?.orderData || !order?.characterProfile) throw new Error('Missing A0/A1 artifacts');

      const logContext = buildInternalLogContext(ctx, order.clerkUserId);

      const blueprint = await startActiveObservation(
        'bookAgent.planStory',
        async (span) => {
          span.update({ orderId, agent: 'A2' });

          const systemPrompt = await getPrompt(ctx, PromptTemplate.BookStoryArchitect, {
            ORDER_JSON: order.orderData!,
            CHARACTER_PROFILE: order.characterProfile!,
          });

          await checkCallBudget(ctx, orderId);
          return await chatJsonForStage<StoryBlueprint>(
            'book.storyPlanning',
            {
              system: systemPrompt,
              user: 'Design the complete story blueprint. Return ONLY valid JSON.',
            },
            undefined,
            logContext,
          );
        },
        { asType: 'span' },
      );

      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderArtifact, {
        orderId,
        field: 'storyBlueprint',
        value: JSON.stringify(blueprint),
      });

      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A2',
        event: 'complete',
        narrative: getNarrative('A2', 'complete'),
      });

      // Schedule A3
      await ctx.scheduler.runAfter(0, internal.bookAgents.writeStory, { orderId });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A2',
        event: 'error',
        narrative: getNarrative('A2', 'error', errMsg),
        details: errMsg,
      });
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A2',
        error: errMsg,
      });
    }
    return null;
  },
});

// ════════════════════════════════════════════════════════════
// A3 — Story Writer (LLM)
// ════════════════════════════════════════════════════════════

export const writeStory = internalAction({
  args: {
    orderId: v.id('bookOrders'),
    corrections: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { orderId, corrections }) => {
    try {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'story_writing',
        currentAgent: 'A3',
      });
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A3',
        event: 'start',
        narrative: getNarrative('A3', 'start'),
      });

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order?.storyBlueprint || !order?.characterProfile)
        throw new Error('Missing A1/A2 artifacts');

      const logContext = buildInternalLogContext(ctx, order.clerkUserId);

      const draft = await startActiveObservation(
        'bookAgent.writeStory',
        async (span) => {
          span.update({ orderId, agent: 'A3', hasCorrections: !!corrections });

          const systemPrompt = await getPrompt(ctx, PromptTemplate.BookStoryWriter, {
            STORY_BLUEPRINT: order.storyBlueprint!,
            CHARACTER_PROFILE: order.characterProfile!,
          });

          // A3 prompt owns the schema contract — a hardcoded JSON schema in the
          // user message would conflict and produce mixed shapes.
          const baseInstruction =
            'Write the complete story in Polish. Output ONLY valid JSON matching the schema defined in your system prompt.';
          const userMessage = corrections
            ? `${baseInstruction}\n\nApply these corrections from the psych reviewer:\n${corrections}`
            : baseInstruction;

          await checkCallBudget(ctx, orderId);
          const raw = await chatJsonForStage<any>(
            'book.storyWriting',
            { system: systemPrompt, user: userMessage },
            undefined,
            logContext,
          );

          return normalizeStoryDraftV2(raw, order.childName);
        },
        { asType: 'span' },
      );

      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderArtifact, {
        orderId,
        field: 'storyDraft',
        value: JSON.stringify(draft),
      });

      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A3',
        event: 'complete',
        narrative: getNarrative('A3', 'complete'),
      });

      // Schedule A4 (psych review)
      await ctx.scheduler.runAfter(0, internal.bookAgents.reviewPsych, { orderId });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A3',
        event: 'error',
        narrative: getNarrative('A3', 'error', errMsg),
        details: errMsg,
      });
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A3',
        error: errMsg,
      });
    }
    return null;
  },
});

// ════════════════════════════════════════════════════════════
// A4 — Psych Reviewer (LLM)
// ════════════════════════════════════════════════════════════

export const reviewPsych = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    try {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'psych_review',
        currentAgent: 'A4',
      });
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A4',
        event: 'start',
        narrative: getNarrative('A4', 'start'),
      });

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (
        !order?.storyDraft ||
        !order?.storyBlueprint ||
        !order?.orderData ||
        !order?.characterProfile
      ) {
        throw new Error('Missing artifacts for psych review');
      }

      // Fast mode: skip QA review entirely
      if (order.skipQaReviews) {
        console.log('[A4] skipQaReviews=true — auto-PASS, proceeding to A5');
        await recordPipelineEvent(ctx, {
          orderId,
          agent: 'A4',
          event: 'complete',
          narrative: 'Recenzja psychologiczna pominięta (tryb szybki)',
        });
        await ctx.scheduler.runAfter(0, internal.bookAgents.directArt, { orderId });
        return null;
      }

      const logContext = buildInternalLogContext(ctx, order.clerkUserId);

      const review = await startActiveObservation(
        'bookAgent.reviewPsych',
        async (span) => {
          span.update({ orderId, agent: 'A4' });

          const systemPrompt = await getPrompt(ctx, PromptTemplate.BookPsychReviewer, {
            ORDER_JSON: order.orderData!,
            CHARACTER_PROFILE: order.characterProfile!,
            STORY_BLUEPRINT: order.storyBlueprint!,
            STORY_DRAFT: order.storyDraft!,
          });

          await checkCallBudget(ctx, orderId);
          return await chatJsonForStage<PsychReview>(
            'book.psychReview',
            {
              system: systemPrompt,
              user: 'Review this story draft. Return ONLY valid JSON.',
            },
            undefined,
            logContext,
          );
        },
        { asType: 'span' },
      );

      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderArtifact, {
        orderId,
        field: 'psychReview',
        value: JSON.stringify(review),
      });

      // Handle review result
      if (review.status === 'PASS') {
        await recordPipelineEvent(ctx, {
          orderId,
          agent: 'A4',
          event: 'complete',
          narrative: getNarrative('A4', 'complete'),
        });
        // Proceed to A5
        await ctx.scheduler.runAfter(0, internal.bookAgents.directArt, { orderId });
      } else if (review.status === 'PASS_WITH_CORRECTIONS') {
        await recordPipelineEvent(ctx, {
          orderId,
          agent: 'A4',
          event: 'complete',
          narrative: getNarrative('A4', 'complete'),
        });
        // Apply corrections to story draft and proceed to A5
        const storyDraft = parseArtifact<StoryDraft>(order.storyDraft, 'storyDraft');
        const corrected = applyCorrections(storyDraft, review);
        await ctx.runMutation(internal.bookPipelineHelpers.updateOrderArtifact, {
          orderId,
          field: 'storyDraft',
          value: JSON.stringify(corrected),
        });
        await ctx.scheduler.runAfter(0, internal.bookAgents.directArt, { orderId });
      } else {
        // FAIL — retry A3
        await recordPipelineEvent(ctx, {
          orderId,
          agent: 'A4',
          event: 'retry',
          narrative: getNarrative('A4', 'retry'),
        });
        const retryCount = (order.retryCount || 0) + 1;
        await ctx.runMutation(internal.bookPipelineHelpers.updateRetryCount, {
          orderId,
          retryCount,
        });

        if (retryCount >= 3) {
          // Max retries — proceed anyway (demo behavior)
          console.warn(`[A4] Max retries reached (${retryCount}), proceeding to A5`);
          await ctx.scheduler.runAfter(0, internal.bookAgents.directArt, { orderId });
        } else {
          // Retry A3 with corrections
          await ctx.scheduler.runAfter(0, internal.bookAgents.writeStory, {
            orderId,
            corrections: JSON.stringify(review.corrections),
          });
        }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A4',
        event: 'error',
        narrative: getNarrative('A4', 'error', errMsg),
        details: errMsg,
      });
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A4',
        error: errMsg,
      });
    }
    return null;
  },
});

// ════════════════════════════════════════════════════════════
// A5 — Art Director (LLM)
// ════════════════════════════════════════════════════════════

export const directArt = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    try {
      // State machine in updateOrderStatus guards against overwriting style_vote
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'art_direction',
        currentAgent: 'A5',
      });
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A5',
        event: 'start',
        narrative: getNarrative('A5', 'start'),
      });

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order?.storyDraft || !order?.characterProfile || !order?.storyBlueprint) {
        throw new Error('Missing artifacts for art direction');
      }

      const logContext = buildInternalLogContext(ctx, order.clerkUserId);
      const profile = parseArtifact<CharacterProfile>(order.characterProfile, 'characterProfile');

      const plan = await startActiveObservation(
        'bookAgent.directArt',
        async (span) => {
          span.update({ orderId, agent: 'A5' });

          // Art style is intentionally NOT baked into A5 prompts.
          // A7 (illustrate) prepends the user's chosen style (A or B) at generation time.
          // If A5 bakes style into ill.prompt, it conflicts with the chosen style in A7.
          // Send blueprint scene summaries instead of full story draft to avoid
          // triggering Google's content filter on sensitive therapeutic topics
          // (e.g. potty training text about children). Blueprint already contains
          // visual_direction and summary_en for each beat — sufficient for art planning.

          // Strip visual_identity.distinguishing_features (e.g. "round cheeks,
          // small button nose") before interpolation. Verified empirically: that
          // value deterministically trips Gemini 2.5 Flash PROHIBITED_CONTENT —
          // a non-configurable hard filter — for bathroom/body scenes with minors.
          // The artifact in DB is left intact for downstream agents that may want it.
          const sanitizedProfile = (() => {
            try {
              const obj = JSON.parse(order.characterProfile!);
              if (obj?.child_character?.visual_identity) {
                delete obj.child_character.visual_identity.distinguishing_features;
              }
              return JSON.stringify(obj);
            } catch {
              return order.characterProfile!;
            }
          })();

          const systemPrompt = await getPrompt(ctx, PromptTemplate.BookArtDirector, {
            CHARACTER_PROFILE: sanitizedProfile,
            STORY_BLUEPRINT: order.storyBlueprint!,
            STORY_DRAFT: '[See blueprint beat summaries and visual_direction fields above]',
            ART_STYLE:
              'NEUTRAL — do NOT include any art style directives in your prompts. ' +
              'Describe scenes, characters, environments, composition, and mood ONLY. ' +
              'The visual rendering style will be applied separately at image generation time.',
            ART_MODIFIERS:
              'NONE — omit all style modifiers from prompts. ' +
              'Focus on: what is happening, who is in the scene, where it takes place, ' +
              'lighting/mood, and camera angle. No references to ink, watercolor, collage, etc.',
          });

          // A5 prompt owns the schema contract — 12/13/15 illustrations with
          // negative_prompt / composition / characters_present keyed by age bracket.
          const userMessage =
            'Design every illustration for this story. Output ONLY valid JSON matching the schema in your system prompt. Be thorough — negative_prompt and composition are safety-critical.';

          await checkCallBudget(ctx, orderId);
          const raw = await chatJsonForStage<any>(
            'book.artDirection',
            { system: systemPrompt, user: userMessage },
            undefined,
            logContext,
          );

          return normalizeIllustrationPlan(raw);
        },
        { asType: 'span' },
      );

      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderArtifact, {
        orderId,
        field: 'illustrationPlan',
        value: JSON.stringify(plan),
      });

      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A5',
        event: 'complete',
        narrative: getNarrative('A5', 'complete'),
      });

      // Mark story track complete + check convergence (atomic)
      await ctx.runMutation(internal.bookPipelineHelpers.completeTrackAndCheck, {
        orderId,
        track: 'story',
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A5',
        event: 'error',
        narrative: getNarrative('A5', 'error', errMsg),
        details: errMsg,
      });
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A5',
        error: errMsg,
      });
    }
    return null;
  },
});

// ════════════════════════════════════════════════════════════
// A6 — Character Designer (Image Generation)
// ════════════════════════════════════════════════════════════

export const designCharacter = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    try {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'character_design',
        currentAgent: 'A6',
      });
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A6',
        event: 'start',
        narrative: getNarrative('A6', 'start'),
      });

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order?.characterProfile) throw new Error('Missing character profile');

      // Build a deterministic portrait from the concrete order fields so the
      // style-vote reference shows the SAME child the parent described in the
      // form — not whatever A1 may have dreamed up in characterProfile.
      const childDesc = buildChildPortrait({
        gender: order.gender,
        ageBracket: order.ageBracket,
        ageNumber: order.ageNumber,
        hairColor: order.hairColor,
        hairStyle: order.hairStyle,
        eyeColor: order.eyeColor,
        skinTone: order.skinTone ?? 'jasna',
        outfit: order.outfit,
        glasses: order.glasses,
      });
      const characterLine = `The main character is ${childDesc}. A realistic human child — not a monster, not a creature, not a plant. Full body visible, standing in a neutral relaxed pose, front view, centered composition, soft plain background.`;

      // Generate Style A reference image
      const promptA = `Children's book character design reference. ${characterLine} Style: ${STYLE_A.style}. ${STYLE_A.modifiers}. Well-lit, no text. ${IMAGE_SAFETY_SUFFIX}`;

      await checkCallBudget(ctx, orderId);
      const imageA = await generateImage(promptA, { width: 512, height: 512 });

      // Generate Style B reference image
      const promptB = `Children's book character design reference. ${characterLine} Style: ${STYLE_B.style}. ${STYLE_B.modifiers}. Well-lit, no text. ${IMAGE_SAFETY_SUFFIX}`;

      await checkCallBudget(ctx, orderId);
      const imageB = await generateImage(promptB, { width: 512, height: 512 });

      // Store images in Convex file storage (placeholder if generation failed)
      const storageIdA = await storeImageOrPlaceholder(ctx, imageA);
      const storageIdB = await storeImageOrPlaceholder(ctx, imageB);

      // Update order with style vote images
      await ctx.runMutation(internal.bookPipelineHelpers.updateStyleVoteImages, {
        orderId,
        styleVoteImageA: storageIdA,
        styleVoteImageB: storageIdB,
      });

      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A6',
        event: 'complete',
        narrative: getNarrative('A6', 'complete'),
      });

      // Batch mode: if chosenStyle is already set, skip the vote pause
      const freshOrder = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (freshOrder?.chosenStyle) {
        await recordPipelineEvent(ctx, {
          orderId,
          agent: 'A6b',
          event: 'complete',
          narrative: getNarrative('A6b', 'complete'),
        });
        await ctx.runMutation(internal.bookPipelineHelpers.completeTrackAndCheck, {
          orderId,
          track: 'image',
        });
      } else {
        // Regular flow — pause for user vote
        await recordPipelineEvent(ctx, {
          orderId,
          agent: 'A6b',
          event: 'start',
          narrative: getNarrative('A6b', 'start'),
        });
        await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
          orderId,
          status: 'style_vote',
          currentAgent: 'A6b',
        });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A6',
        event: 'error',
        narrative: getNarrative('A6', 'error', errMsg),
        details: errMsg,
      });
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A6',
        error: errMsg,
      });
    }
    return null;
  },
});

/** Fetch all illustration images from storage as Uint8Array for multimodal LLM input */
async function fetchIllustrationImages(
  ctx: ActionCtx,
  illustrations: Array<{ storageId: any; illustrationId: string }>,
  agent: string,
): Promise<Array<{ data: Uint8Array; mimeType: string }>> {
  const images: Array<{ data: Uint8Array; mimeType: string }> = [];
  for (const ill of illustrations) {
    try {
      const url = await ctx.storage.getUrl(ill.storageId);
      if (!url) continue;
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      images.push({ data: buf, mimeType: 'image/png' });
    } catch (e) {
      console.warn(`[${agent}] Failed to fetch illustration ${ill.illustrationId}:`, e);
    }
  }
  return images;
}

/** Store generated image data or a placeholder if generation failed */
async function storeImageOrPlaceholder(ctx: ActionCtx, imageData: Uint8Array | null): Promise<any> {
  if (imageData) {
    // Copy into a fresh, exactly-sized ArrayBuffer. `imageData.buffer`
    // would expose the entire underlying allocation, which for Node Buffers
    // (returned by pngjs) is an 8 KB pool shared with unrelated data —
    // corrupting the PNG with arbitrary garbage at the storage layer.
    const blob = new Blob([new Uint8Array(imageData)], { type: 'image/png' });
    return await ctx.storage.store(blob);
  }
  return await storeMinimalPlaceholder(ctx);
}

/** Store a minimal placeholder image when Gemini is unavailable */
async function storeMinimalPlaceholder(ctx: ActionCtx) {
  // Minimal valid 1x1 white PNG (67 bytes)
  const minPng = new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0,
    0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68, 65, 84, 8, 215, 99, 248, 207, 192, 0, 0, 0, 3, 0,
    1, 24, 216, 95, 168, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
  ]);
  const blob = new Blob([minPng], { type: 'image/png' });
  return await ctx.storage.store(blob);
}

// ════════════════════════════════════════════════════════════
// A7 — Illustrator (Image Generation)
// ════════════════════════════════════════════════════════════

export const illustrate = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    try {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'illustrating',
        currentAgent: 'A7',
      });
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A7',
        event: 'start',
        narrative: getNarrative('A7', 'start'),
      });

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order?.illustrationPlan || !order?.characterProfile) {
        throw new Error('Missing illustration plan or character profile');
      }

      const plan = parseArtifact<IllustrationPlan>(order.illustrationPlan, 'illustrationPlan');
      const profile = parseArtifact<CharacterProfile>(order.characterProfile, 'characterProfile');
      const chosenStyle = order.chosenStyle === 'B' ? STYLE_B : STYLE_A;

      // Build consistency preamble (trustee-parity: include guide + visual anchor)
      const styleLine = `${chosenStyle.style}. ${chosenStyle.modifiers}.`;
      // Deterministic child portrait from order fields — same source as A6 so
      // the style-vote reference and every in-book illustration show the same
      // child, regardless of what A1 wrote into characterProfile.
      const childDesc = buildChildPortrait({
        gender: order.gender,
        ageBracket: order.ageBracket,
        ageNumber: order.ageNumber,
        hairColor: order.hairColor,
        hairStyle: order.hairStyle,
        eyeColor: order.eyeColor,
        skinTone: order.skinTone ?? 'jasna',
        outfit: order.outfit,
        glasses: order.glasses,
      });
      const childLine = `Main character (appears in EVERY image): ${childDesc}. A realistic human child — not a monster, not a creature, not a plant.`;
      const guideLine = profile.guideCharacter?.descriptionEn
        ? `Guide character: ${profile.guideCharacter.descriptionEn}.`
        : '';
      const anchorLine = profile.visualAnchor
        ? `Recurring visual anchor object: ${profile.visualAnchor}.`
        : '';
      const consistencyPreamble = [styleLine, childLine, guideLine, anchorLine]
        .filter(Boolean)
        .join(' ');

      // Sequential generation is mandatory — each call goes through the per-order
      // LLM budget counter, and Gemini image gen is rate-limited per project.
      for (let i = 0; i < plan.illustrations.length; i++) {
        const ill = plan.illustrations[i];
        const id = ill.id;
        const width = ill.width ?? 900;
        const height = ill.height ?? 900;

        const basePrompt = ill.illustrationPrompt || `Children's book illustration: ${id}`;
        const compositionLine = ill.composition ? `${ill.composition}.` : '';
        const moodLine = ill.mood ? `${ill.mood}.` : '';
        const negativeLine = ill.negativePrompt ? `Avoid: ${ill.negativePrompt}.` : '';

        // Mood illustrations skip the character preamble — they're atmospheric
        // backdrops keyed to mood_palette, no child/guide figure.
        const preamble = ill.category === 'mood' ? styleLine : consistencyPreamble;

        const fullPrompt = [
          preamble,
          compositionLine,
          moodLine,
          basePrompt,
          'No text in image.',
          negativeLine,
          IMAGE_SAFETY_SUFFIX,
        ]
          .filter(Boolean)
          .join(' ');

        // Dev-only short-circuit: rasterize the prompt as ASCII PNG instead
        // of calling Gemini Flash image. Skips the rate-limit gap too.
        let imageData: Uint8Array | null;
        if (order.fastImage) {
          imageData = asciiPlaceholderPng(fullPrompt, { width, height });
        } else {
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, IMAGE_GEN_MIN_INTERVAL_MS));
          }
          await checkCallBudget(ctx, orderId);
          imageData = await generateImage(fullPrompt, { width, height });
        }
        const storageId = await storeImageOrPlaceholder(ctx, imageData);

        // NOTE: sceneRef is legacy (v.number()), incompatible with new string
        // beat_ref values like "4a"/"4b". Omit to avoid a schema migration —
        // A9 composer is now driven by the deterministic page sequence, not
        // sceneRef lookups.
        await ctx.runMutation(internal.bookPipelineHelpers.saveIllustration, {
          orderId,
          illustrationId: id,
          storageId,
          prompt: fullPrompt,
          width,
          height,
        });
      }

      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A7',
        event: 'complete',
        narrative: getNarrative('A7', 'complete'),
      });

      // Schedule A8
      await ctx.scheduler.runAfter(0, internal.bookAgents.reviewVisual, { orderId });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A7',
        event: 'error',
        narrative: getNarrative('A7', 'error', errMsg),
        details: errMsg,
      });
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A7',
        error: errMsg,
      });
    }
    return null;
  },
});

// ════════════════════════════════════════════════════════════
// A8 — Visual QA (Multimodal — sends actual images to LLM)
// ════════════════════════════════════════════════════════════

export const reviewVisual = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    try {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'visual_qa',
        currentAgent: 'A8',
      });
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A8',
        event: 'start',
        narrative: getNarrative('A8', 'start'),
      });

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order?.illustrationPlan || !order?.characterProfile) {
        throw new Error('Missing artifacts for visual QA');
      }

      // Fast mode: skip visual QA entirely
      if (order.skipQaReviews) {
        console.log('[A8] skipQaReviews=true — auto-PASS, proceeding to A9');
        await recordPipelineEvent(ctx, {
          orderId,
          agent: 'A8',
          event: 'complete',
          narrative: 'Kontrola wizualna pominięta (tryb szybki)',
        });
        await ctx.scheduler.runAfter(0, internal.bookAgents.composePdf, { orderId });
        return null;
      }

      const logContext = buildInternalLogContext(ctx, order.clerkUserId);
      const plan = parseArtifact<IllustrationPlan>(order.illustrationPlan, 'illustrationPlan');
      const profile = parseArtifact<CharacterProfile>(order.characterProfile, 'characterProfile');

      // Fetch illustration images from storage
      const illustrations = await ctx.runQuery(internal.bookPipelineHelpers.getIllustrations, {
        orderId,
      });
      const images = await fetchIllustrationImages(ctx, illustrations, 'A8');

      const qa = await startActiveObservation(
        'bookAgent.reviewVisual',
        async (span) => {
          span.update({ orderId, agent: 'A8', imageCount: images.length });

          const systemPrompt = await getPrompt(ctx, PromptTemplate.BookVisualQa, {
            VISUAL_ANCHOR: profile.visualAnchor || profile.visualPromptBase || '',
            CHARACTER_DESCRIPTION_EN: profile.descriptionEn || profile.physicalDescription || '',
            GUIDE_DESCRIPTION_EN: profile.guideCharacter?.descriptionEn || '',
            ILLUSTRATION_PLAN: JSON.stringify(plan.illustrations),
          });

          await checkCallBudget(ctx, orderId);
          return await chatJsonForStageWithImages<VisualQa>(
            'book.visualQa',
            {
              system: systemPrompt,
              user: `Review these ${images.length} illustrations against the illustration plan. Score each image and determine if any need regeneration. Return ONLY valid JSON.`,
              images,
            },
            undefined,
            logContext,
          );
        },
        { asType: 'span' },
      );

      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderArtifact, {
        orderId,
        field: 'visualQa',
        value: JSON.stringify(qa),
      });

      // Handle REGENERATE with retry logic (max 3)
      if (qa.status === 'REGENERATE') {
        await recordPipelineEvent(ctx, {
          orderId,
          agent: 'A8',
          event: 'retry',
          narrative: getNarrative('A8', 'retry'),
        });
        const retryCount = (order.visualQaRetryCount || 0) + 1;
        await ctx.runMutation(internal.bookPipelineHelpers.updateVisualQaRetryCount, {
          orderId,
          visualQaRetryCount: retryCount,
        });

        if (retryCount < 3) {
          console.warn(`[A8] REGENERATE requested (attempt ${retryCount}/3), re-scheduling A7`);
          await ctx.scheduler.runAfter(0, internal.bookAgents.illustrate, { orderId });
        } else {
          console.warn(`[A8] Max visual QA retries reached (${retryCount}), proceeding to A9`);
          await recordPipelineEvent(ctx, {
            orderId,
            agent: 'A8',
            event: 'complete',
            narrative: getNarrative('A8', 'complete'),
          });
          await ctx.scheduler.runAfter(0, internal.bookAgents.composePdf, { orderId });
        }
      } else {
        // PASS → proceed to A9
        await recordPipelineEvent(ctx, {
          orderId,
          agent: 'A8',
          event: 'complete',
          narrative: getNarrative('A8', 'complete'),
        });
        await ctx.scheduler.runAfter(0, internal.bookAgents.composePdf, { orderId });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A8',
        event: 'error',
        narrative: getNarrative('A8', 'error', errMsg),
        details: errMsg,
      });
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A8',
        error: errMsg,
      });
    }
    return null;
  },
});

// ════════════════════════════════════════════════════════════
// A9 — Book Composer (PDF generation)
// ════════════════════════════════════════════════════════════

export const composePdf = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    try {
      // Gate: don't render the PDF until the parent has decided about a
      // dedication. Park the order in `awaiting_dedication` and let
      // submitParentDedication/skipParentDedication kick us back here.
      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order?.dedicationDecided) {
        await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
          orderId,
          status: 'awaiting_dedication',
          currentAgent: 'A8',
        });
        await recordPipelineEvent(ctx, {
          orderId,
          agent: 'A8',
          event: 'info',
          narrative: 'Czekam na dedykację rodzica przed złożeniem PDF...',
        });
        return null;
      }

      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'composing_pdf',
        currentAgent: 'A9',
      });
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A9',
        event: 'start',
        narrative: getNarrative('A9', 'start'),
      });

      // Schedule the actual PDF generation to the separate bookComposer file
      await ctx.scheduler.runAfter(0, internal.bookComposer.generatePdf, { orderId });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await recordPipelineEvent(ctx, {
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

// ════════════════════════════════════════════════════════════
// A10 — Final QA (programmatic sanity check — no LLM)
// ════════════════════════════════════════════════════════════

export const reviewFinal = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    try {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'final_qa',
        currentAgent: 'A10',
      });
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A10',
        event: 'start',
        narrative: getNarrative('A10', 'start'),
      });

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order?.storyDraft || !order?.characterProfile || !order?.illustrationPlan) {
        throw new Error('Missing artifacts for final QA');
      }

      // Fast mode: skip final QA entirely
      if (order.skipQaReviews) {
        console.log('[A10] skipQaReviews=true — auto-DELIVER, proceeding to A11');
        await recordPipelineEvent(ctx, {
          orderId,
          agent: 'A10',
          event: 'complete',
          narrative: 'Kontrola końcowa pominięta (tryb szybki)',
        });
        await ctx.scheduler.runAfter(0, internal.bookAgents.deliver, { orderId });
        return null;
      }

      // ── Programmatic checks ──────────────────────────
      const issues: string[] = [];

      // 1. Parse artifacts
      let draft: StoryDraft | null = null;
      let plan: IllustrationPlan | null = null;
      try {
        draft = parseArtifact<StoryDraft>(order.storyDraft, 'storyDraft');
        parseArtifact<CharacterProfile>(order.characterProfile, 'characterProfile');
        plan = parseArtifact<IllustrationPlan>(order.illustrationPlan, 'illustrationPlan');
      } catch {
        issues.push(
          'Cannot parse one or more artifacts (storyDraft, characterProfile, illustrationPlan)',
        );
      }

      const artifactsPresent = draft !== null && plan !== null;

      // 2. Child's name in story
      const childName = order.childName;
      let nameInStory = false;
      if (draft) {
        const allText = [draft.title, draft.dedication, ...draft.pages.map((p) => p.text)].join(
          ' ',
        );
        nameInStory = allText.includes(childName);
        if (!nameInStory) {
          issues.push(`Child name "${childName}" not found in story text`);
        }
      }

      // Dedication may come from order.parentDedication (UI input) instead of
      // draft.dedication. Absent dedication is a warning, not a block — some
      // flows skip the UI step.
      const dedicationPresent = !!order.parentDedication?.trim() || !!draft?.dedication?.trim();
      if (!dedicationPresent) {
        issues.push('Dedication is empty (parent did not supply one)');
      }

      // 4. Pages complete — all pages have non-empty text
      let pagesComplete = false;
      if (draft) {
        const emptyPages = draft.pages.filter((p) => !p.text?.trim());
        pagesComplete = draft.pages.length > 0 && emptyPages.length === 0;
        if (draft.pages.length === 0) {
          issues.push('Story has no pages');
        } else if (emptyPages.length > 0) {
          issues.push(`${emptyPages.length} page(s) have empty text`);
        }
      }

      // 5. Illustrations complete — count matches plan
      const illustrations = await ctx.runQuery(internal.bookPipelineHelpers.getIllustrations, {
        orderId,
      });
      const expectedCount = plan?.illustrations?.length ?? 0;
      const actualCount = illustrations.length;
      const illustrationsComplete = expectedCount > 0 && actualCount >= expectedCount;
      if (expectedCount === 0) {
        issues.push('Illustration plan has no illustrations');
      } else if (actualCount < expectedCount) {
        issues.push(`Expected ${expectedCount} illustrations, got ${actualCount}`);
      }

      // 6. Parent card
      const parentCardPresent = !!(draft?.parentCard && draft.parentCard.questions?.length > 0);
      if (!parentCardPresent) {
        issues.push('Parent card missing or has no questions');
      }

      // Dedication and parent card are warnings, not hard blocks. Parent card
      // content may come from A2 blueprint; dedication may come from UI input.
      const allChecksPassed =
        artifactsPresent && nameInStory && pagesComplete && illustrationsComplete;

      const qa: FinalQa = {
        status: allChecksPassed ? 'PASS' : 'BLOCK',
        checks: {
          artifacts_present: artifactsPresent,
          name_in_story: nameInStory,
          dedication_present: dedicationPresent,
          pages_complete: pagesComplete,
          illustrations_complete: illustrationsComplete,
          parent_card_present: parentCardPresent,
        },
        issues,
      };

      console.log(`[A10] Programmatic QA: ${qa.status} (${issues.length} issues)`, issues);

      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderArtifact, {
        orderId,
        field: 'finalQa',
        value: JSON.stringify(qa),
      });

      if (qa.status === 'BLOCK') {
        const blockMsg = `Final QA blocked: ${issues.join('; ')}`;
        console.error(`[A10] ${blockMsg}`);
        await recordPipelineEvent(ctx, {
          orderId,
          agent: 'A10',
          event: 'error',
          narrative: getNarrative('A10', 'error', blockMsg),
          details: blockMsg,
        });
        await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
          orderId,
          status: 'failed',
          currentAgent: 'A10',
          error: blockMsg,
        });
      } else {
        await recordPipelineEvent(ctx, {
          orderId,
          agent: 'A10',
          event: 'complete',
          narrative: getNarrative('A10', 'complete'),
        });
        await ctx.scheduler.runAfter(0, internal.bookAgents.deliver, { orderId });
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A10',
        event: 'error',
        narrative: getNarrative('A10', 'error', errMsg),
        details: errMsg,
      });
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A10',
        error: errMsg,
      });
    }
    return null;
  },
});

// ════════════════════════════════════════════════════════════
// A11 — Delivery (Code only)
// ════════════════════════════════════════════════════════════

export const deliver = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    try {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'delivering',
        currentAgent: 'A11',
      });
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A11',
        event: 'start',
        narrative: getNarrative('A11', 'start'),
      });

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order) throw new Error('Order not found');

      console.log(`[A11] === DELIVERY COMPLETE ===`);
      console.log(`[A11] Order: ${orderId}`);
      console.log(`[A11] Child: ${order.childName} (${order.ageBracket})`);
      console.log(`[A11] Has PDF: ${!!order.pdfStorageId}`);

      // Mark complete
      await ctx.runMutation(internal.bookPipelineHelpers.markOrderComplete, { orderId });
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A11',
        event: 'complete',
        narrative: getNarrative('A11', 'complete'),
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await recordPipelineEvent(ctx, {
        orderId,
        agent: 'A11',
        event: 'error',
        narrative: getNarrative('A11', 'error', errMsg),
        details: errMsg,
      });
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A11',
        error: errMsg,
      });
    }
    return null;
  },
});
