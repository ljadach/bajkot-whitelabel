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
import { startActiveObservation } from './lib/langfuse';
import { buildInternalLogContext } from './lib/actionHelpers';
import { generateImage } from './lib/geminiImageGen';
import {
  PROBLEMS,
  HAIR_COLOR_MAP,
  HAIR_STYLE_MAP,
  EYE_COLOR_MAP,
  SKIN_TONE_MAP,
  OUTFIT_MAP,
  STYLE_A,
  STYLE_B,
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
import { normalizePages, applyCorrections } from './lib/bookAgentUtils';

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
    throw new Error(
      `Prompt not found in DB for template: ${template}. Run seedPrompts migration first.`,
    );
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

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order) throw new Error('Order not found');

      // Validate against known maps
      if (!PROBLEMS[order.problemId]) throw new Error(`Unknown problemId: ${order.problemId}`);
      if (!HAIR_COLOR_MAP[order.hairColor])
        throw new Error(`Unknown hairColor: ${order.hairColor}`);
      if (!HAIR_STYLE_MAP[order.hairStyle])
        throw new Error(`Unknown hairStyle: ${order.hairStyle}`);
      if (!EYE_COLOR_MAP[order.eyeColor]) throw new Error(`Unknown eyeColor: ${order.eyeColor}`);
      if (!SKIN_TONE_MAP[order.skinTone]) throw new Error(`Unknown skinTone: ${order.skinTone}`);
      if (!OUTFIT_MAP[order.outfit]) throw new Error(`Unknown outfit: ${order.outfit}`);

      const problem = PROBLEMS[order.problemId];
      const outfit = OUTFIT_MAP[order.outfit];

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
        hairColorEn: HAIR_COLOR_MAP[order.hairColor],
        hairStyle: order.hairStyle,
        hairStyleEn: HAIR_STYLE_MAP[order.hairStyle],
        eyeColor: order.eyeColor,
        eyeColorEn: EYE_COLOR_MAP[order.eyeColor],
        skinTone: order.skinTone,
        skinToneEn: SKIN_TONE_MAP[order.skinTone],
        outfit: order.outfit,
        outfitPl: outfit.pl,
        outfitEn: outfit.en,
      };

      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderArtifact, {
        orderId,
        field: 'orderData',
        value: JSON.stringify(normalized),
      });

      // Schedule A1
      await ctx.scheduler.runAfter(0, internal.bookAgents.profileChild, { orderId });
    } catch (error) {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A0',
        error: error instanceof Error ? error.message : String(error),
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

          const result = await chatJsonForStage<CharacterProfile>(
            'book.profiling',
            {
              system: systemPrompt,
              user: 'Generate the character profile for this order. Return ONLY valid JSON.',
            },
            undefined,
            logContext,
          );

          return result;
        },
        { asType: 'span' },
      );

      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderArtifact, {
        orderId,
        field: 'characterProfile',
        value: JSON.stringify(profile),
      });

      // Fork: schedule both story track (A2) and image track (A6) in parallel
      await ctx.scheduler.runAfter(0, internal.bookAgents.planStory, { orderId });
      await ctx.scheduler.runAfter(0, internal.bookAgents.designCharacter, { orderId });
    } catch (error) {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A1',
        error: error instanceof Error ? error.message : String(error),
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

      // Schedule A3
      await ctx.scheduler.runAfter(0, internal.bookAgents.writeStory, { orderId });
    } catch (error) {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A2',
        error: error instanceof Error ? error.message : String(error),
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

          const jsonSchema = `Return ONLY valid JSON matching this EXACT schema:
{
  "title": "string",
  "dedication": "string",
  "pages": [
    { "beatNumber": 1, "text": "Polish prose for beat 1", "readAloudVersion": "simplified version" },
    { "beatNumber": 2, "text": "...", "readAloudVersion": "..." },
    { "beatNumber": 3, "text": "...", "readAloudVersion": "..." },
    { "beatNumber": 4, "text": "...", "readAloudVersion": "..." },
    { "beatNumber": 5, "text": "...", "readAloudVersion": "..." },
    { "beatNumber": 6, "text": "...", "readAloudVersion": "..." }
  ],
  "wordCount": 780
}`;

          let userMessage = `Write the complete story.\n\n${jsonSchema}`;
          if (corrections) {
            userMessage = `Write the complete story, applying these corrections from the psych reviewer:\n\n${corrections}\n\n${jsonSchema}`;
          }

          const raw = await chatJsonForStage<any>(
            'book.storyWriting',
            { system: systemPrompt, user: userMessage },
            undefined,
            logContext,
          );

          // Normalize: handle LLM output variations
          const normalized: StoryDraft = {
            title: raw.title || '',
            dedication: raw.dedication || '',
            pages: normalizePages(raw),
            wordCount: raw.wordCount || raw.total_word_count || 0,
          };

          return normalized;
        },
        { asType: 'span' },
      );

      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderArtifact, {
        orderId,
        field: 'storyDraft',
        value: JSON.stringify(draft),
      });

      // Schedule A4 (psych review)
      await ctx.scheduler.runAfter(0, internal.bookAgents.reviewPsych, { orderId });
    } catch (error) {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A3',
        error: error instanceof Error ? error.message : String(error),
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

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (
        !order?.storyDraft ||
        !order?.storyBlueprint ||
        !order?.orderData ||
        !order?.characterProfile
      ) {
        throw new Error('Missing artifacts for psych review');
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
        // Proceed to A5
        await ctx.scheduler.runAfter(0, internal.bookAgents.directArt, { orderId });
      } else if (review.status === 'PASS_WITH_CORRECTIONS') {
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
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A4',
        error: error instanceof Error ? error.message : String(error),
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
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'art_direction',
        currentAgent: 'A5',
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

          const systemPrompt = await getPrompt(ctx, PromptTemplate.BookArtDirector, {
            CHARACTER_PROFILE: order.characterProfile!,
            STORY_BLUEPRINT: order.storyBlueprint!,
            STORY_DRAFT: order.storyDraft!,
            ART_STYLE: profile.visualPromptBase || STYLE_A.style,
            ART_MODIFIERS: STYLE_A.modifiers,
          });

          const userMessage = `Design all 7 illustration prompts (cover + scene_1 through scene_6).

Return ONLY valid JSON matching this schema:
{
  "styleGuide": "description of the visual style",
  "characterConsistencyNotes": "notes for keeping character consistent",
  "illustrations": [
    {
      "illustrationId": "cover",
      "beatRef": 0,
      "sceneDescription": "...",
      "prompt": "THE FULL 80-150 word image generation prompt in English",
      "mood": "...",
      "keyElements": ["element1", "element2"],
      "width": 600,
      "height": 900
    },
    { "illustrationId": "scene_1", "beatRef": 1, ... },
    { "illustrationId": "scene_2", "beatRef": 2, ... },
    { "illustrationId": "scene_3", "beatRef": 3, ... },
    { "illustrationId": "scene_4", "beatRef": 4, ... },
    { "illustrationId": "scene_5", "beatRef": 5, ... },
    { "illustrationId": "scene_6", "beatRef": 6, ... }
  ]
}`;

          const raw = await chatJsonForStage<any>(
            'book.artDirection',
            { system: systemPrompt, user: userMessage },
            undefined,
            logContext,
          );

          // Normalize
          const rawIlls: any[] = raw.illustrations || [];
          const expectedIds = [
            'cover',
            'scene_1',
            'scene_2',
            'scene_3',
            'scene_4',
            'scene_5',
            'scene_6',
          ];

          const normalized: IllustrationPlan = {
            styleGuide: raw.styleGuide || raw.style_guide || '',
            characterConsistencyNotes:
              raw.characterConsistencyNotes || raw.character_consistency_notes || '',
            illustrations: rawIlls.map((ill: any, i: number) => ({
              illustrationId:
                ill.illustrationId ||
                ill.id ||
                ill.illustration_id ||
                expectedIds[i] ||
                `scene_${i}`,
              beatRef: ill.beatRef ?? ill.beat_ref ?? ill.scene_ref ?? (i === 0 ? 0 : i),
              sceneDescription:
                ill.sceneDescription || ill.scene_description || ill.composition || '',
              prompt: ill.prompt || ill.image_prompt || '',
              mood: ill.mood || '',
              keyElements: ill.keyElements || ill.key_elements || [],
              width: ill.width || (i === 0 ? 600 : 900),
              height: ill.height || (i === 0 ? 900 : 600),
            })),
          };

          return normalized;
        },
        { asType: 'span' },
      );

      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderArtifact, {
        orderId,
        field: 'illustrationPlan',
        value: JSON.stringify(plan),
      });

      // Story track done — check if image track (style vote) is also done
      await ctx.runMutation(internal.bookPipelineHelpers.checkParallelTracksComplete, {
        orderId,
      });
    } catch (error) {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A5',
        error: error instanceof Error ? error.message : String(error),
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

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order?.characterProfile) throw new Error('Missing character profile');

      const profile = parseArtifact<CharacterProfile>(order.characterProfile, 'characterProfile');
      const childDesc = profile.physicalDescription || profile.visualPromptBase || '';
      const childName = profile.childName || order.childName;

      // Generate Style A reference image
      const promptA = `Children's book character design in BOLD GRAPHIC MIXED-MEDIA style: THICK BLACK INK OUTLINES, paper collage textures, FLAT color shapes, cream paper background. Character: ${childDesc}, standing in a neutral pose, front view, full body visible, centered composition. Style: ${STYLE_A.style}. ${STYLE_A.modifiers}. Character design reference sheet, well-lit, no text.`;

      const imageA = await generateImage(promptA, { width: 512, height: 512 });

      // Generate Style B reference image
      const promptB = `Children's book character design in SOFT WATERCOLOR PAINTING style: NO OUTLINES, wet watercolor washes, paint bleeding and dripping, dreamy atmospheric background. Character: ${childDesc}, standing in a neutral pose, front view, full body visible, centered composition. Style: ${STYLE_B.style}. ${STYLE_B.modifiers}. Character design reference sheet, well-lit, no text.`;

      const imageB = await generateImage(promptB, { width: 512, height: 512 });

      // Store images in Convex file storage
      let storageIdA;
      let storageIdB;

      if (imageA) {
        const blobA = new Blob([imageA.buffer as ArrayBuffer], { type: 'image/png' });
        storageIdA = await ctx.storage.store(blobA);
      } else {
        // Fallback: store a minimal 1x1 PNG placeholder
        storageIdA = await storeMinimalPlaceholder(ctx);
      }

      if (imageB) {
        const blobB = new Blob([imageB.buffer as ArrayBuffer], { type: 'image/png' });
        storageIdB = await ctx.storage.store(blobB);
      } else {
        storageIdB = await storeMinimalPlaceholder(ctx);
      }

      // Update order with style vote images
      await ctx.runMutation(internal.bookPipelineHelpers.updateStyleVoteImages, {
        orderId,
        styleVoteImageA: storageIdA,
        styleVoteImageB: storageIdB,
      });

      // Batch mode: if chosenStyle is already set, skip the vote pause
      const freshOrder = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (freshOrder?.chosenStyle) {
        await ctx.runMutation(internal.bookPipelineHelpers.checkParallelTracksComplete, {
          orderId,
        });
      } else {
        // Regular flow — pause for user vote
        await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
          orderId,
          status: 'style_vote',
          currentAgent: 'A6b',
        });
      }
    } catch (error) {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A6',
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  },
});

/** Fetch all illustration images from storage as Uint8Array for multimodal LLM input */
async function fetchIllustrationImages(
  ctx: any,
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

/** Store a minimal placeholder image when Gemini is unavailable */
async function storeMinimalPlaceholder(ctx: any) {
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

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order?.illustrationPlan || !order?.characterProfile) {
        throw new Error('Missing illustration plan or character profile');
      }

      const plan = parseArtifact<IllustrationPlan>(order.illustrationPlan, 'illustrationPlan');
      const profile = parseArtifact<CharacterProfile>(order.characterProfile, 'characterProfile');
      const chosenStyle = order.chosenStyle === 'B' ? STYLE_B : STYLE_A;

      // Build consistency preamble
      const styleLine = `${chosenStyle.style}. ${chosenStyle.modifiers}.`;
      const childLine = profile.physicalDescription
        ? `Main character (appears in EVERY image): ${profile.physicalDescription}.`
        : '';
      const consistencyPreamble = [styleLine, childLine].filter(Boolean).join(' ');

      // Generate each illustration sequentially (rate limiting)
      for (const ill of plan.illustrations) {
        const id = ill.illustrationId;
        const basePrompt = ill.prompt || `Children's book illustration: ${id}`;
        const fullPrompt = `${consistencyPreamble} Scene: ${basePrompt}. No text in image.`;

        const isCover = id === 'cover';
        const width = isCover ? 600 : 900;
        const height = isCover ? 900 : 600;

        const imageData = await generateImage(fullPrompt, { width, height });

        let storageId;
        if (imageData) {
          const blob = new Blob([imageData.buffer as ArrayBuffer], { type: 'image/png' });
          storageId = await ctx.storage.store(blob);
        } else {
          storageId = await storeMinimalPlaceholder(ctx);
        }

        await ctx.runMutation(internal.bookPipelineHelpers.saveIllustration, {
          orderId,
          illustrationId: id,
          storageId,
          prompt: fullPrompt,
          width,
          height,
          sceneRef: ill.beatRef || undefined,
        });
      }

      // Schedule A8
      await ctx.scheduler.runAfter(0, internal.bookAgents.reviewVisual, { orderId });
    } catch (error) {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A7',
        error: error instanceof Error ? error.message : String(error),
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

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order?.illustrationPlan || !order?.characterProfile) {
        throw new Error('Missing artifacts for visual QA');
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
            VISUAL_ANCHOR: profile.visualPromptBase || '',
            CHARACTER_DESCRIPTION_EN: profile.physicalDescription || '',
            GUIDE_DESCRIPTION_EN: '',
            ILLUSTRATION_PLAN: JSON.stringify(plan.illustrations),
          });

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
          await ctx.scheduler.runAfter(0, internal.bookAgents.composePdf, { orderId });
        }
      } else {
        // PASS → proceed to A9
        await ctx.scheduler.runAfter(0, internal.bookAgents.composePdf, { orderId });
      }
    } catch (error) {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A8',
        error: error instanceof Error ? error.message : String(error),
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
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'composing_pdf',
        currentAgent: 'A9',
      });

      // Schedule the actual PDF generation to the separate bookComposer file
      await ctx.scheduler.runAfter(0, internal.bookComposer.generatePdf, { orderId });
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

// ════════════════════════════════════════════════════════════
// A10 — Final QA (Multimodal — text + images, richer checks)
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

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order?.storyDraft || !order?.characterProfile || !order?.illustrationPlan) {
        throw new Error('Missing artifacts for final QA');
      }

      const logContext = buildInternalLogContext(ctx, order.clerkUserId);

      // Fetch illustration images for multimodal review
      const illustrations = await ctx.runQuery(internal.bookPipelineHelpers.getIllustrations, {
        orderId,
      });
      const images = await fetchIllustrationImages(ctx, illustrations, 'A10');

      const qa = await startActiveObservation(
        'bookAgent.reviewFinal',
        async (span) => {
          span.update({ orderId, agent: 'A10', imageCount: images.length });

          const systemPrompt = await getPrompt(ctx, PromptTemplate.BookFinalQa, {
            STORY_DRAFT: order.storyDraft!,
            CHARACTER_PROFILE: order.characterProfile!,
            ILLUSTRATION_PLAN: order.illustrationPlan!,
          });

          return await chatJsonForStageWithImages<FinalQa>(
            'book.finalQa',
            {
              system: systemPrompt,
              user: `Perform final QA on this complete book. You have the story text, character profile, illustration plan, and ${images.length} actual illustrations attached. Check personalization, completeness, text-image coherence, and content safety. Return ONLY valid JSON.`,
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
        field: 'finalQa',
        value: JSON.stringify(qa),
      });

      // Handle recommendation
      if (qa.recommendation === 'BLOCK') {
        console.error(`[A10] Final QA BLOCKED order ${orderId}: ${qa.notes}`);
        await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
          orderId,
          status: 'failed',
          currentAgent: 'A10',
          error: `Final QA blocked: ${qa.notes}`,
        });
      } else {
        if (qa.recommendation === 'DELIVER_WITH_FLAG') {
          console.warn(`[A10] Delivering with flag: ${qa.notes}`);
        }
        // DELIVER or DELIVER_WITH_FLAG → schedule A11
        await ctx.scheduler.runAfter(0, internal.bookAgents.deliver, { orderId });
      }
    } catch (error) {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A10',
        error: error instanceof Error ? error.message : String(error),
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

      const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
      if (!order) throw new Error('Order not found');

      console.log(`[A11] === DELIVERY COMPLETE ===`);
      console.log(`[A11] Order: ${orderId}`);
      console.log(`[A11] Child: ${order.childName} (${order.ageBracket})`);
      console.log(`[A11] Has PDF: ${!!order.pdfStorageId}`);

      // Mark complete
      await ctx.runMutation(internal.bookPipelineHelpers.markOrderComplete, { orderId });
    } catch (error) {
      await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
        orderId,
        status: 'failed',
        currentAgent: 'A11',
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  },
});
