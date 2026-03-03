import { action, internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { chatJsonForStage } from './lib/llmClient';
import { prepareAuthenticatedLlmAction, buildInternalLogContext } from './lib/actionHelpers';
import { EDITORIAL_GUIDE_SECTION } from './lib/editorialGuide';

export const scoreContrapositor = internalAction({
  args: {
    artifactId: v.id('learnerArtifacts'),
    chapterContent: v.string(),
    argument: v.string(),
    clerkUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const logContext = buildInternalLogContext(ctx, args.clerkUserId);

    const result = await chatJsonForStage<{ score: number; feedback: string }>(
      'contrapositor',
      {
        system:
          'You are evaluating a learner\'s devil\'s advocate argument against a chapter\'s claims. Score the depth of critical analysis, logical coherence, and identification of genuine weaknesses. IMPORTANT: Write feedback in the same language as the chapter content. Return JSON: { "score": <number 0-100>, "feedback": "<string, 1-2 sentences>" }',
        user: `## Chapter Content\n${args.chapterContent}\n\n## Learner's Counter-Argument\n${args.argument}`,
      },
      { score: 50, feedback: 'Reasonable critique. Try to identify more specific logical gaps or unstated assumptions.' },
      logContext
    );

    const score = Math.max(0, Math.min(100, Number(result.score) || 50));

    await ctx.runMutation(internal.learnerArtifacts.updateScore, {
      artifactId: args.artifactId,
      score,
      feedback: result.feedback || 'Evaluation complete.',
    });

    return null;
  },
});

export const generateProbes = action({
  args: {
    courseDocumentId: v.id('courseDocuments'),
    chapterNumber: v.number(),
    profileXml: v.string(),
    chapterContent: v.string(),
  },
  returns: v.array(v.object({ probe: v.string(), bloomLevel: v.string() })),
  handler: async (ctx, args) => {
    const { logContext } = await prepareAuthenticatedLlmAction(ctx);

    return chatJsonForStage<Array<{ probe: string; bloomLevel: string }>>(
      'probes',
      {
        system:
          'Generate 3-5 thinking probes for this chapter, aligned to Bloom\'s taxonomy. Chapter 1 probes should be Remember/Understand level. Chapter 2: Apply/Analyze. Chapter 3: Create/Evaluate. Personalize based on the learner\'s profile. IMPORTANT: Write the probes in the same language as the chapter content. Return JSON array: [{ "probe": "<string>", "bloomLevel": "<string>" }]',
        user: `## Learner Profile\n${args.profileXml}\n\n## Chapter Content (Chapter ${args.chapterNumber})\n${args.chapterContent}`,
      },
      [
        { probe: 'What are the key concepts in this chapter?', bloomLevel: 'Remember' },
        { probe: 'How would you apply this knowledge in your daily work?', bloomLevel: 'Apply' },
        { probe: 'What assumptions does this chapter make that you could challenge?', bloomLevel: 'Evaluate' },
      ],
      logContext
    );
  },
});

export const generateConceptRadar = action({
  args: {
    chapterContent: v.string(),
    chapterNumber: v.number(),
    profileXml: v.string(),
  },
  returns: v.array(v.object({ concept: v.string(), hint: v.string() })),
  handler: async (ctx, args) => {
    const { logContext } = await prepareAuthenticatedLlmAction(ctx);

    return chatJsonForStage<Array<{ concept: string; hint: string }>>(
      'conceptRadar',
      {
        system:
          'Extract 5-8 key concepts/terms from this chapter that a learner should understand. For each concept provide a short hint (5-10 words) about why it matters. Personalize based on the learner\'s profile - focus on concepts relevant to their work context. IMPORTANT: Write concepts and hints in the same language as the chapter content. Return JSON array: [{ "concept": "<term>", "hint": "<why it matters>" }]',
        user: `## Learner Profile\n${args.profileXml}\n\n## Chapter Content (Chapter ${args.chapterNumber})\n${args.chapterContent}`,
      },
      [{ concept: 'Key concept', hint: 'Core idea from this chapter' }],
      logContext
    );
  },
});

export const generateSkeletonKey = action({
  args: {
    chapterContent: v.string(),
    chapterNumber: v.number(),
    profileXml: v.string(),
  },
  returns: v.object({
    level1: v.string(),
    level2: v.string(),
    level3: v.string(),
  }),
  handler: async (ctx, args) => {
    const { logContext } = await prepareAuthenticatedLlmAction(ctx);

    return chatJsonForStage<{ level1: string; level2: string; level3: string }>(
      'skeletonKey',
      {
        system:
          'Compress this chapter into 3 progressive levels of distillation, personalized for this learner\'s context. Level 1: ~50 words capturing the key narrative. Level 2: ~25 words capturing the core argument. Level 3: ~10 words capturing the essence. IMPORTANT: Write in the same language as the chapter content. Return JSON: { "level1": "...", "level2": "...", "level3": "..." }',
        user: `## Learner Profile\n${args.profileXml}\n\n## Chapter Content (Chapter ${args.chapterNumber})\n${args.chapterContent}`,
      },
      { level1: 'Chapter overview pending.', level2: 'Core argument pending.', level3: 'Essence pending.' },
      logContext
    );
  },
});

export const generateTomorrowTasks = action({
  args: {
    chapterContent: v.string(),
    profileXml: v.string(),
    courseDocumentId: v.id('courseDocuments'),
  },
  returns: v.array(
    v.object({
      task: v.string(),
      why: v.string(),
      difficulty: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const { logContext } = await prepareAuthenticatedLlmAction(ctx);

    return chatJsonForStage<Array<{ task: string; why: string; difficulty: string }>>(
      'tomorrowTasks',
      {
        system:
          'Based on what this learner just read and their professional profile, generate exactly 3 concrete, actionable tasks they could do tomorrow to apply this knowledge. Mix difficulties: one quick win (5 min), one medium effort (30 min), one deep work (1+ hour). Be specific to their tools, role, and context. IMPORTANT: Write tasks and explanations in the same language as the chapter content. Return JSON array: [{ "task": "<specific action>", "why": "<connection to chapter>", "difficulty": "quick|medium|deep" }]',
        user: `## Learner Profile\n${args.profileXml}\n\n## Chapter Content\n${args.chapterContent}`,
      },
      [
        { task: 'Review your notes from today', why: 'Consolidation', difficulty: 'quick' },
        { task: 'Apply one technique from this chapter', why: 'Practice', difficulty: 'medium' },
        { task: 'Teach a colleague what you learned', why: 'Feynman technique', difficulty: 'deep' },
      ],
      logContext
    );
  },
});

export const generateFeynmanQuestions = action({
  args: {
    chapterContent: v.string(),
    chapterNumber: v.number(),
    profileXml: v.string(),
  },
  returns: v.array(v.object({ question: v.string() })),
  handler: async (ctx, args) => {
    const { logContext } = await prepareAuthenticatedLlmAction(ctx);

    return chatJsonForStage<Array<{ question: string }>>(
      'feynmanQuestions',
      {
        system:
          'Generate 5 Feynman-style thinking questions for this chapter. These are provocative, simple-sounding questions that force the learner to confront whether they truly understand the material. Think: "If you had to explain this to a bartender..." style. Questions should be short (1 sentence), use plain language, and target genuine understanding gaps. Personalize based on the learner\'s profile. IMPORTANT: Write the questions in the same language as the chapter content. Return JSON array: [{ "question": "<string>" }]',
        user: `## Learner Profile\n${args.profileXml}\n\n## Chapter Content (Chapter ${args.chapterNumber})\n${args.chapterContent}`,
      },
      [
        { question: 'If you had to explain this to a bartender, what would you say?' },
        { question: 'What is the simplest experiment that could prove you wrong?' },
        { question: 'Imagine you knew nothing. Where would you start?' },
        { question: 'What is the one thing here that nobody talks about?' },
        { question: 'If this were a machine, which part would break first?' },
      ],
      logContext
    );
  },
});

// ============================================
// Exploration Chapters
// ============================================

export const startExplorationChapter = action({
  args: {
    courseDocumentId: v.id('courseDocuments'),
    probeText: v.string(),
    profileXml: v.optional(v.string()),
    videoEnhanced: v.optional(v.boolean()),
  },
  returns: v.object({
    chapterNumber: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{ chapterNumber: number; success: boolean; error?: string }> => {
    const { clerkUserId } = await prepareAuthenticatedLlmAction(ctx);

    const existing = await ctx.runQuery(internal.learnerArtifacts.getExplorationChapters, {
      courseDocumentId: args.courseDocumentId,
      clerkUserId,
    });

    if (existing.length >= 7) {
      return { chapterNumber: 0, success: false, error: 'max_chapters_reached' };
    }

    const nextChapterNumber = 4 + existing.length;

    await ctx.scheduler.runAfter(0, internal.instrumentAi.generateExplorationChapterInternal, {
      courseDocumentId: args.courseDocumentId,
      chapterNumber: nextChapterNumber,
      probeText: args.probeText,
      profileXml: args.profileXml ?? '',
      clerkUserId,
      videoEnhanced: args.videoEnhanced ?? false,
    });

    return { chapterNumber: nextChapterNumber, success: true };
  },
});

export const generateExplorationChapterInternal = internalAction({
  args: {
    courseDocumentId: v.id('courseDocuments'),
    chapterNumber: v.number(),
    probeText: v.string(),
    profileXml: v.string(),
    clerkUserId: v.string(),
    videoEnhanced: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const logContext = buildInternalLogContext(ctx, args.clerkUserId);

    // Build context
    // 1. Read base handbook
    const doc = await ctx.runQuery(internal.courseAiHelpers.getCourseDocumentWithHandbook, {
      documentId: args.courseDocumentId,
    });
    let handbookContext = '';
    if (doc?.handbook) {
      handbookContext = [
        `## Chapter 1: ${doc.handbook.chapter1.title}\n${doc.handbook.chapter1.content.slice(0, 1500)}`,
        `## Chapter 2: ${doc.handbook.chapter2.title}\n${doc.handbook.chapter2.content.slice(0, 1500)}`,
        `## Chapter 3: ${doc.handbook.chapter3.title}\n${doc.handbook.chapter3.content.slice(0, 1500)}`,
      ].join('\n\n');
    }

    // 2. Read previous exploration chapters
    const prevExploration = await ctx.runQuery(internal.learnerArtifacts.getExplorationChapters, {
      courseDocumentId: args.courseDocumentId,
      clerkUserId: args.clerkUserId,
    });
    let explorationContext = '';
    if (prevExploration.length > 0) {
      explorationContext = prevExploration
        .map((ch) => {
          try {
            const parsed = JSON.parse(ch.content);
            return `## Exploration Chapter ${ch.chapterNumber}: ${parsed.title || 'Untitled'}\n${(parsed.content || '').slice(0, 800)}`;
          } catch {
            return '';
          }
        })
        .filter(Boolean)
        .join('\n\n');
    }

    // 3. Read tool artifacts (non-exploration)
    const allArtifacts = await ctx.runQuery(internal.learnerArtifacts.getAllArtifactsInternal, {
      courseDocumentId: args.courseDocumentId,
      clerkUserId: args.clerkUserId,
    });
    let toolContext = '';
    const nonExploration = allArtifacts.filter((a) => a.toolId !== 'exploration');
    if (nonExploration.length > 0) {
      const toolLines = nonExploration.map((a) => `[${a.toolId} ch${a.chapterNumber}]: ${a.content.slice(0, 300)}`);
      toolContext = toolLines.join('\n').slice(0, 2000);
    }

    // 4. Video corpus
    let videoCorpusSection = '';
    if (args.videoEnhanced) {
      try {
        const activeCorpusId = await ctx.runQuery(internal.admin.config.getInternal, {
          key: 'active_corpus_id',
        });
        if (activeCorpusId) {
          const corpus = await ctx.runQuery(internal.admin.corpus.getInternal, {
            corpusId: activeCorpusId as Id<'knowledgeCorpora'>,
          });
          if (corpus?.content) {
            videoCorpusSection = `VIDEO CORPUS:\n${corpus.content.slice(0, 3000)}`;
          }
        }
      } catch (e) {
        console.warn('[generateExplorationChapter] Failed to load video corpus:', e instanceof Error ? e.message : e);
      }
    }

    const fullContext = [
      args.profileXml ? `## Learner Profile\n${args.profileXml}` : '',
      handbookContext ? `## Base Chapters\n${handbookContext}` : '',
      explorationContext ? `## Previous Exploration Chapters\n${explorationContext}` : '',
      toolContext ? `## Learner Tool Artifacts\n${toolContext}` : '',
      videoCorpusSection,
    ]
      .filter(Boolean)
      .join('\n\n');

    const saveContent = async (phase: string, title: string, content: string) => {
      await ctx.runMutation(internal.learnerArtifacts.saveArtifactInternal, {
        clerkUserId: args.clerkUserId,
        courseDocumentId: args.courseDocumentId,
        chapterNumber: args.chapterNumber,
        toolId: 'exploration',
        content: JSON.stringify({ phase, title, content, probeText: args.probeText }),
      });
    };

    const guideSection = EDITORIAL_GUIDE_SECTION;

    // Phase 1: Sketch (~300 words)
    const sketch = await chatJsonForStage<{ title: string; content: string }>(
      'exploration.sketch',
      {
        system:
          'You are writing an exploration chapter for a personalized learning course. The learner clicked a thinking probe and wants a full chapter exploring that direction. Write a SKETCH — a ~300 word draft exploring the probe question in the context of what the learner has already studied. Include a compelling title. Write in the same language as the base chapters. Return JSON: { "title": "<chapter title>", "content": "<markdown content ~300 words>" }\n\n' +
          guideSection,
        user: `## Probe Question\n${args.probeText}\n\n${fullContext}`,
      },
      { title: 'Exploration', content: 'Content generation in progress...' },
      logContext
    );
    await saveContent('sketch', sketch.title, sketch.content);

    // Phase 2: Expanded (~800 words)
    const expanded = await chatJsonForStage<{ title: string; content: string }>(
      'exploration.expanded',
      {
        system:
          'You are expanding a sketch into a fuller exploration chapter (~800 words). Build on the sketch, add depth, examples personalized to the learner\'s profile, and connect to their previous learning. Keep the same title unless you have a significantly better one. Write in the same language as the base chapters. Return JSON: { "title": "<chapter title>", "content": "<markdown content ~800 words>" }\n\n' +
          guideSection,
        user: `## Sketch\nTitle: ${sketch.title}\n${sketch.content}\n\n## Probe Question\n${args.probeText}\n\n${fullContext}`,
      },
      { title: sketch.title, content: sketch.content },
      logContext
    );
    await saveContent('expanded', expanded.title, expanded.content);

    // Phase 3: Full (~1500+ words, with video markers if enabled)
    const videoInstruction = args.videoEnhanced && videoCorpusSection ? '\n\nIMPORTANT: Where relevant, embed video references using the syntax :::video{src="filename.mp4" start=N end=N}::: — only use videos from the VIDEO CORPUS provided.' : '';

    const full = await chatJsonForStage<{ title: string; content: string }>(
      'exploration.full',
      {
        system: `You are finalizing an exploration chapter into a complete, polished piece (~1500 words). This is the final version. Make it engaging, well-structured with markdown headers (##, ###), include practical examples and actionable insights personalized for the learner. Connect to their work context and previous chapters. Write in the same language as the base chapters.${videoInstruction} Return JSON: { "title": "<chapter title>", "content": "<markdown content ~1500 words>" }\n\n${guideSection}`,
        user: `## Expanded Draft\nTitle: ${expanded.title}\n${expanded.content}\n\n## Probe Question\n${args.probeText}\n\n${fullContext}`,
      },
      { title: expanded.title, content: expanded.content },
      logContext
    );
    await saveContent('complete', full.title, full.content);

    return null;
  },
});
