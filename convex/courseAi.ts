import { action, internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { chatJsonForStageWithSources } from './lib/llmClient';
import { renderPrompt, PromptTemplate } from './lib/prompts';
import { startActiveObservation } from './lib/langfuse';
import { ConfigKey } from './lib/config';
import { getConfigValue } from './lib/configClient';
import { getLanguageFromProfile, DEFAULT_LANGUAGE_NAME } from './lib/language';
import { EDITORIAL_GUIDE_SECTION } from './lib/editorialGuide';
import { loadAndPreselectCorpus } from './lib/corpusPreselection';
import { buildInternalLogContext } from './lib/actionHelpers';

// ============================================
// Style compliance check (logging only, never rejects)
// ============================================

const FILLER_WORDS = /\b(very|actually|basically|just|really|simply|clearly|obviously|literally)\b/gi;
const FORBIDDEN_OPENERS = [/^jako\s/i, /^as a \[?role/i, /^ai is (transforming|revolutionizing)/i, /^przejdźmy do/i, /^let'?s dive in/i];
const MAX_PARAGRAPH_SENTENCES = 3;

interface StyleViolation {
  type: string;
  detail: string;
  chapter: string;
}

function checkStyleCompliance(handbook: { chapter1: { title: string; content: string }; chapter2: { title: string; content: string }; chapter3: { title: string; content: string } }): { violations: StyleViolation[]; complianceScore: number } {
  const violations: StyleViolation[] = [];

  for (const [key, chapter] of Object.entries(handbook) as [string, { title: string; content: string }][]) {
    const label = key.replace('chapter', 'Chapter ');
    const content = chapter.content || '';

    // Check filler words
    const fillerMatches = content.match(FILLER_WORDS);
    if (fillerMatches) {
      violations.push({
        type: 'filler_words',
        detail: `Found ${fillerMatches.length} filler word(s): ${[...new Set(fillerMatches.map((w) => w.toLowerCase()))].join(', ')}`,
        chapter: label,
      });
    }

    // Check forbidden openers
    const firstLine =
      content
        .split('\n')
        .find((l) => l.trim() && !l.trim().startsWith('#'))
        ?.trim() || '';
    for (const pattern of FORBIDDEN_OPENERS) {
      if (pattern.test(firstLine)) {
        violations.push({
          type: 'forbidden_opener',
          detail: `Opens with forbidden pattern: "${firstLine.slice(0, 60)}..."`,
          chapter: label,
        });
      }
    }

    // Check paragraph length (split by double newline)
    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim() && !p.trim().startsWith('#') && !p.trim().startsWith('```') && !p.trim().startsWith(':::'));
    for (const para of paragraphs) {
      const sentences = para.split(/[.!?]+/).filter((s) => s.trim().length > 10);
      if (sentences.length > MAX_PARAGRAPH_SENTENCES) {
        violations.push({
          type: 'long_paragraph',
          detail: `Paragraph has ${sentences.length} sentences (max ${MAX_PARAGRAPH_SENTENCES}): "${para.slice(0, 50)}..."`,
          chapter: label,
        });
      }
    }
  }

  // Score: start at 100, deduct per violation (capped at 0)
  const complianceScore = Math.max(0, 100 - violations.length * 10);

  return { violations, complianceScore };
}

// Internal action for generating a single handbook (called by scheduler)
export const generateHandbookInternal = internalAction({
  args: {
    documentId: v.id('courseDocuments'),
    outlinePage: v.string(),
    fullPlanPage: v.string(),
    profileXml: v.string(),
    clerkUserId: v.string(),
    language: v.optional(v.string()),
    videoEnhanced: v.optional(v.boolean()),
    assessmentSummary: v.optional(v.string()),
    siblingModules: v.optional(v.string()),
    skillVerification: v.optional(v.string()),
    aiFluency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logContext = buildInternalLogContext(ctx, args.clerkUserId);
    const language = args.language || DEFAULT_LANGUAGE_NAME;

    // Update status to generating
    await ctx.runMutation(internal.courseDocuments.updateDocumentStatus, {
      documentId: args.documentId,
      status: 'generating',
    });

    try {
      const videoEnhanced = args.videoEnhanced === true;

      const { result, sources: webSearchSources } = await startActiveObservation(
        'action.generateHandbook',
        async (span) => {
          span.update({
            action: 'generateHandbook',
            documentId: args.documentId,
            language,
            videoEnhanced,
          });

          const currentDate = new Date().toISOString().slice(0, 10);
          let systemPrompt: string;
          let userPrompt: string;

          if (videoEnhanced) {
            // Video-enhanced path: load corpus, preselect relevant segments, use enhanced prompts
            const videoCorpusSection = await loadAndPreselectCorpus({
              ctx,
              pageContext: args.outlinePage,
              profileXml: args.profileXml,
              maxSegments: 15,
              logContext,
              headerLabel: 'VIDEO CORPUS (reference relevant segments in your content):',
            });

            systemPrompt = await renderPrompt(PromptTemplate.HandbookSystemVideoEnhanced, {
              LANGUAGE: language,
              EDITORIAL_GUIDE: EDITORIAL_GUIDE_SECTION,
              CURRENT_DATE: currentDate,
            });
            userPrompt = await renderPrompt(PromptTemplate.HandbookUserVideoEnhanced, {
              PROFILE_XML: args.profileXml,
              OUTLINE_PAGE: args.outlinePage,
              FULL_PLAN_PAGE: args.fullPlanPage,
              VIDEO_CORPUS: videoCorpusSection,
              ASSESSMENT_SUMMARY: args.assessmentSummary || '',
              SIBLING_MODULES: args.siblingModules || '',
              SKILL_VERIFICATION: args.skillVerification || '',
              AI_FLUENCY: args.aiFluency || '',
            });
          } else {
            // Production path: original prompts, no corpus
            systemPrompt = await renderPrompt(PromptTemplate.HandbookSystem, {
              LANGUAGE: language,
              EDITORIAL_GUIDE: EDITORIAL_GUIDE_SECTION,
              CURRENT_DATE: currentDate,
            });
            userPrompt = await renderPrompt(PromptTemplate.HandbookUser, {
              PROFILE_XML: args.profileXml,
              OUTLINE_PAGE: args.outlinePage,
              FULL_PLAN_PAGE: args.fullPlanPage,
              ASSESSMENT_SUMMARY: args.assessmentSummary || '',
              SIBLING_MODULES: args.siblingModules || '',
              SKILL_VERIFICATION: args.skillVerification || '',
              AI_FLUENCY: args.aiFluency || '',
            });
          }

          const fallback = defaultHandbook(args.outlinePage);

          const { data: result, sources } = await chatJsonForStageWithSources<{
            chapter1: { title: string; content: string; imagePrompt?: string };
            chapter2: { title: string; content: string; imagePrompt?: string };
            chapter3: { title: string; content: string; imagePrompt?: string };
          }>('handbook', { system: systemPrompt, user: userPrompt }, fallback, logContext);

          span.update({
            chapter1_length: result.chapter1?.content?.length || 0,
            chapter2_length: result.chapter2?.content?.length || 0,
            chapter3_length: result.chapter3?.content?.length || 0,
            web_search_sources: sources.length,
          });

          // Style compliance check (logging only — never rejects content)
          if (result.chapter1 && result.chapter2 && result.chapter3) {
            const { violations, complianceScore } = checkStyleCompliance(result);
            span.update({
              style_violations: violations.length,
              style_compliance_score: complianceScore,
              style_violation_details: violations.length > 0 ? JSON.stringify(violations.slice(0, 10)) : undefined,
            });
          }

          return { result, sources };
        },
        { asType: 'span' }
      );

      // Transform to handbook format with image placeholders
      const handbook = {
        chapter1: {
          title: result.chapter1?.title || 'Chapter 1',
          content: result.chapter1?.content || '',
          imagePlaceholder: result.chapter1?.imagePrompt
            ? {
                model: 'google-nano-banana' as const,
                prompt: result.chapter1.imagePrompt,
                mockUrl: '/placeholder-image.svg',
              }
            : undefined,
        },
        chapter2: {
          title: result.chapter2?.title || 'Chapter 2',
          content: result.chapter2?.content || '',
          imagePlaceholder: result.chapter2?.imagePrompt
            ? {
                model: 'google-nano-banana' as const,
                prompt: result.chapter2.imagePrompt,
                mockUrl: '/placeholder-image.svg',
              }
            : undefined,
        },
        chapter3: {
          title: result.chapter3?.title || 'Chapter 3',
          content: result.chapter3?.content || '',
          imagePlaceholder: result.chapter3?.imagePrompt
            ? {
                model: 'google-nano-banana' as const,
                prompt: result.chapter3.imagePrompt,
                mockUrl: '/placeholder-image.svg',
              }
            : undefined,
        },
      };

      // Update status to completed with handbook
      await ctx.runMutation(internal.courseDocuments.updateDocumentStatus, {
        documentId: args.documentId,
        status: 'completed',
        handbook,
        webSearchSources: webSearchSources.length > 0 ? webSearchSources : undefined,
      });

      // Check if auto-generation of exercises is enabled
      const autoGenerateExercises = await getConfigValue(ctx, ConfigKey.AUTO_GENERATE_EXERCISES);

      if (autoGenerateExercises === 'true') {
        // Generate exercises for each chapter (scheduled in parallel)
        const chapters = [
          { number: 1, title: handbook.chapter1.title, content: handbook.chapter1.content },
          { number: 2, title: handbook.chapter2.title, content: handbook.chapter2.content },
          { number: 3, title: handbook.chapter3.title, content: handbook.chapter3.content },
        ];

        for (const chapter of chapters) {
          await ctx.scheduler.runAfter(0, internal.exerciseAi.generateExerciseForChapter, {
            courseDocumentId: args.documentId,
            chapterNumber: chapter.number,
            chapterTitle: chapter.title,
            chapterContent: chapter.content,
            userContext: args.profileXml,
            language,
            clerkUserId: args.clerkUserId,
          });
        }
      }

      return { success: true };
    } catch (error) {
      // Update status to failed
      await ctx.runMutation(internal.courseDocuments.updateDocumentStatus, {
        documentId: args.documentId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return { success: false, error: String(error) };
    }
  },
});

// Public action to start course generation for all pages
export const startCourseGeneration = action({
  args: {
    videoEnhanced: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }
    const clerkUserId = identity.subject;

    // Rate limiting
    await ctx.runMutation(internal.rateLimitMutation.checkAndRecordLLMRateLimit, {
      actionType: 'llm_call',
      clerkUserId,
    });

    // Get profile with plan data
    const profile = await ctx.runQuery(internal.courseAiHelpers.getProfileForCourseGeneration, {
      clerkUserId,
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    if (!profile.planOutline) {
      throw new Error('No plan outline available');
    }

    // Parse outline and fullPlan
    let outline: Array<{ page?: number; title?: string; summary?: string }> = [];
    let fullPlan: Array<any> = [];

    try {
      outline = JSON.parse(profile.planOutline);
    } catch {
      throw new Error('Invalid plan outline format');
    }

    try {
      fullPlan = profile.planFull ? JSON.parse(profile.planFull) : [];
    } catch {
      fullPlan = [];
    }

    if (!Array.isArray(outline) || outline.length === 0) {
      throw new Error('Plan outline is empty');
    }

    if (outline.length !== 6) {
      console.warn(`[courseGeneration] Expected 6 pages in outline, got ${outline.length}. Playbook may have generated fewer pages than required.`);
    }

    // Create document entries
    const pages = outline.map((page, index) => ({
      index,
      title: page.title || `Page ${index + 1}`,
    }));

    const documentIds: Id<'courseDocuments'>[] = await ctx.runMutation(internal.courseAiHelpers.createCourseDocumentsInternal, {
      clerkUserId,
      pages,
    });

    // Build compact assessment summary for handbook context
    const assessmentSummary = buildAssessmentSummary(profile.assessmentReport);

    // Build skill data strings for handbook prompts
    const skillVerification = buildSkillVerificationSection(profile.skillVerification);
    const aiFluency = buildAiFluencySection(profile.inferredAiFluency);

    // Schedule parallel generation for each page
    const language = getLanguageFromProfile(profile);
    for (let i = 0; i < outline.length; i++) {
      const outlinePage = outline[i];
      const fullPlanPage = fullPlan[i] || {};
      const siblingModules = buildSiblingModulesSection(outline, i);

      await ctx.scheduler.runAfter(0, internal.courseAi.generateHandbookInternal, {
        documentId: documentIds[i],
        outlinePage: JSON.stringify(outlinePage),
        fullPlanPage: JSON.stringify(fullPlanPage),
        profileXml: profile.profileXml || '',
        clerkUserId,
        language,
        videoEnhanced: args.videoEnhanced,
        assessmentSummary,
        siblingModules,
        skillVerification,
        aiFluency,
      });
    }

    return { documentIds, pageCount: outline.length };
  },
});

// Public action for manual regeneration of a single handbook
export const regenerateHandbook = action({
  args: {
    documentId: v.id('courseDocuments'),
    videoEnhanced: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }
    const clerkUserId = identity.subject;

    // Rate limiting
    await ctx.runMutation(internal.rateLimitMutation.checkAndRecordLLMRateLimit, {
      actionType: 'llm_call',
      clerkUserId,
    });

    // Get document and verify ownership
    const document = await ctx.runQuery(internal.courseAiHelpers.getCourseDocumentInternal, {
      documentId: args.documentId,
    });

    if (!document) {
      throw new Error('Document not found');
    }

    if (document.clerkUserId !== clerkUserId) {
      throw new Error('Not authorized');
    }

    // Get profile for regeneration
    const profile = await ctx.runQuery(internal.courseAiHelpers.getProfileForCourseGeneration, {
      clerkUserId,
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Parse outline and fullPlan to get the specific page data
    let outline: Array<any> = [];
    let fullPlan: Array<any> = [];

    try {
      outline = profile.planOutline ? JSON.parse(profile.planOutline) : [];
      fullPlan = profile.planFull ? JSON.parse(profile.planFull) : [];
    } catch {
      throw new Error('Invalid plan data');
    }

    const outlinePage = outline[document.pageIndex] || {};
    const fullPlanPage = fullPlan[document.pageIndex] || {};

    // Reset document status
    await ctx.runMutation(internal.courseDocuments.updateDocumentStatus, {
      documentId: args.documentId,
      status: 'pending',
    });

    // Schedule regeneration
    const language = getLanguageFromProfile(profile);
    const assessmentSummary = buildAssessmentSummary(profile.assessmentReport);
    const skillVerification = buildSkillVerificationSection(profile.skillVerification);
    const aiFluency = buildAiFluencySection(profile.inferredAiFluency);

    const siblingModules = buildSiblingModulesSection(outline, document.pageIndex);

    await ctx.scheduler.runAfter(0, internal.courseAi.generateHandbookInternal, {
      documentId: args.documentId,
      outlinePage: JSON.stringify(outlinePage),
      fullPlanPage: JSON.stringify(fullPlanPage),
      profileXml: profile.profileXml || '',
      clerkUserId,
      language,
      videoEnhanced: args.videoEnhanced,
      assessmentSummary,
      siblingModules,
      skillVerification,
      aiFluency,
    });

    return { success: true };
  },
});

function buildSiblingModulesSection(outline: { title?: string }[], excludeIndex: number): string {
  const allTitles = outline.map((p) => p.title || '').filter(Boolean);
  const siblingTitles = allTitles.filter((_, idx) => idx !== excludeIndex);
  if (siblingTitles.length === 0) return '';
  return `OTHER MODULES (avoid repeating their content):\n${siblingTitles.map((t, j) => `${j + 1}. ${t}`).join('\n')}`;
}

const ASSESSMENT_SUMMARY_MAX_CHARS = 800;

/**
 * Extract a compact summary from the full assessment report.
 * The assessment is already 180-300 words, so we just trim if needed.
 */
function buildAssessmentSummary(assessmentReport: string | undefined): string {
  if (!assessmentReport) return '';
  const trimmed = assessmentReport.trim();
  if (trimmed.length <= ASSESSMENT_SUMMARY_MAX_CHARS) return trimmed;
  return trimmed.slice(0, ASSESSMENT_SUMMARY_MAX_CHARS) + '…';
}

/**
 * Build a human-readable skill verification section for handbook prompts.
 * Computes gap between self-assessment (1-5 Likert) and performance (0-1 scaled to 5).
 */
function buildSkillVerificationSection(sv: { performanceScore: number; selfAssessment: number; level?: string; feedback?: string } | undefined): string {
  if (!sv) return '';
  const perfOn5 = sv.performanceScore * 5;
  const gap = sv.selfAssessment - perfOn5;
  const lines: string[] = [`Performance score: ${sv.performanceScore.toFixed(2)} (${(sv.performanceScore * 100).toFixed(0)}%)`, `Self-assessment: ${sv.selfAssessment}/5`];
  if (sv.level) lines.push(`Level: ${sv.level}`);
  if (sv.feedback) lines.push(`Feedback: ${sv.feedback}`);

  if (gap > 1.5) {
    lines.push(`GAP ALERT: Self-report ${sv.selfAssessment}/5 vs performance ${perfOn5.toFixed(1)}/5 — learner OVERESTIMATES skill by ${gap.toFixed(1)} points. Focus on fundamentals they think they know.`);
  } else if (gap < -1.0) {
    lines.push(`GAP NOTE: Self-report ${sv.selfAssessment}/5 vs performance ${perfOn5.toFixed(1)}/5 — learner UNDERESTIMATES skill by ${Math.abs(gap).toFixed(1)} points. Skip basics, use advanced examples.`);
  }

  return lines.join('\n');
}

/**
 * Build a human-readable AI fluency section for handbook prompts.
 */
function buildAiFluencySection(af: { score: number; justification: string } | undefined): string {
  if (!af) return '';

  let label: string;
  if (af.score < 30) {
    label = 'Beginner';
  } else if (af.score < 60) {
    label = 'Intermediate';
  } else {
    label = 'Advanced';
  }

  return `AI Fluency: ${af.score}/100 (${label})\nJustification: ${af.justification}`;
}

function defaultHandbook(outlinePageJson: string) {
  let pageTitle = 'Course Page';
  try {
    const parsed = JSON.parse(outlinePageJson);
    pageTitle = parsed.title || pageTitle;
  } catch {
    // ignore
  }

  return {
    chapter1: {
      title: `Understanding ${pageTitle}`,
      content: `# Understanding ${pageTitle}\n\nThis chapter introduces the core concepts and foundational knowledge you need.\n\n## Key Concepts\n\n- Concept 1: Understanding the basics\n- Concept 2: Building mental models\n- Concept 3: Connecting theory to practice\n\n## Getting Started\n\nBegin by familiarizing yourself with the fundamental principles...`,
      imagePrompt: `Educational illustration showing the core concepts of ${pageTitle}`,
    },
    chapter2: {
      title: `Applying ${pageTitle}`,
      content: `# Applying ${pageTitle}\n\nThis chapter focuses on practical applications and hands-on examples.\n\n## Practical Examples\n\n1. **Example 1**: Step-by-step walkthrough\n2. **Example 2**: Real-world application\n3. **Example 3**: Common patterns\n\n## Try It Yourself\n\nPractice with these exercises to reinforce your learning...`,
      imagePrompt: `Diagram showing practical application of ${pageTitle}`,
    },
    chapter3: {
      title: `Mastering ${pageTitle}`,
      content: `# Mastering ${pageTitle}\n\nThis chapter covers advanced tips and common pitfalls.\n\n## Advanced Tips\n\n- **Tip 1**: Optimize your workflow\n- **Tip 2**: Leverage advanced features\n- **Tip 3**: Scale your approach\n\n## Common Pitfalls\n\n- Avoid rushing through fundamentals\n- Don't skip practice exercises\n- Remember to review and iterate`,
      imagePrompt: `Advanced techniques illustration for ${pageTitle}`,
    },
  };
}
