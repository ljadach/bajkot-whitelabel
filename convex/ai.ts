import { action } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { chatJsonForStage, chatJsonForStageWithSources, type LlmLogContext } from './lib/llmClient';
import { renderPrompt, PromptTemplate, getPromptConfigs, PLAYBOOK_VIDEO_INSTRUCTIONS, USE_LANGFUSE_PROMPTS } from './lib/prompts';
import { startActiveObservation } from './lib/langfuse';
import { defaultProfileXml, buildModuleHints } from './lib/profileXml';
import { fetchPrompt } from './lib/langfusePrompts';
import { assertAdmin } from './lib/roles';
import { chatMessageValidator } from './lib/chatMessage';
import { prepareAuthenticatedLlmAction } from './lib/actionHelpers';
import { DEFAULT_LANGUAGE_NAME } from './lib/language';
import { EDITORIAL_GUIDE_SECTION } from './lib/editorialGuide';
import { loadAndPreselectCorpus } from './lib/corpusPreselection';

/** Maximum Q&A exchanges before forcing intake completion. Prevents runaway LLM loops. */
const MAX_INTAKE_QUESTIONS = 30;

export const generateNextQuestion = action({
  args: {
    chatHistory: v.array(chatMessageValidator),
    profileXml: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { logContext } = await prepareAuthenticatedLlmAction(ctx);
    const language = args.language || DEFAULT_LANGUAGE_NAME;

    return startActiveObservation(
      'action.generateNextQuestion',
      async (span) => {
        span.update({
          action: 'generateNextQuestion',
          history_length: args.chatHistory.length,
          language,
        });
        const result = await runGenerateNextQuestion({ ...args, language }, logContext);
        span.update({
          output_preview: JSON.stringify(result).slice(0, 400),
        });
        return result;
      },
      { asType: 'span' }
    );
  },
});

async function runGenerateNextQuestion(args: any, logContext: LlmLogContext) {
  function ensureStyledMessage(msg: string | undefined, targetField?: string) {
    const text = (msg || '').trim();
    if (!text) return '';
    const hasEmphasis = /(\*\*.+\*\*|\*.+\*|<u>.+<\/u>|`.+`)/.test(text);
    const hasEmoji = /[\u{1F300}-\u{1FAFF}]/u.test(text);
    let out = text;
    if (!hasEmphasis) {
      const qIndex = out.indexOf('?');
      if (qIndex > 0) {
        out = `**${out.slice(0, qIndex + 1)}**${out.slice(qIndex + 1)}`;
      } else {
        const cut = Math.min(out.length, 80);
        out = `**${out.slice(0, cut)}**${out.slice(cut)}`;
      }
    }
    if (!hasEmoji) {
      const emoji = targetField === 'tools' ? ' ✨' : targetField === 'needs' ? ' 🧭' : targetField === 'negativePreferences' ? ' ✂️' : ' ✅';
      out = `${out} ${emoji}`.trim();
    }
    return out;
  }

  function addWarmWelcome(message: string | undefined): string {
    const base = (message || '').trim();
    if (!base) {
      return "Hey there! I'm excited to shape a plan with you — let's get started.";
    }
    const hasGreeting = /^(hey|hi|hello|cze|heya|hola)\b/i.test(base);
    if (hasGreeting) return base;
    return `Hey there! I'm excited to shape a plan with you. ${base}`;
  }

  const isFirstMessage = args.chatHistory.length === 0;
  const questionNumber = args.chatHistory.filter((m: any) => m.type === 'question').length + 1;
  const currentProfileXml = typeof args.profileXml === 'string' && args.profileXml.trim() ? args.profileXml : defaultProfileXml();
  const language = args.language || DEFAULT_LANGUAGE_NAME;

  // Guard: force-end intake if too many questions (prevents runaway LLM cost)
  if (questionNumber > MAX_INTAKE_QUESTIONS) {
    console.warn('[generateNextQuestion] Intake forced completion — max questions exceeded', {
      questionNumber,
      maxAllowed: MAX_INTAKE_QUESTIONS,
      historyLength: args.chatHistory.length,
    });
    const forceMessage = language.startsWith('pl')
      ? 'Dzi\u0119kuj\u0119 za odpowiedzi! Mam wystarczaj\u0105co du\u017co informacji, aby przygotowa\u0107 Tw\u00f3j profil. Przejd\u017amy dalej! \u2705'
      : 'Thank you for your answers! I have enough information to prepare your profile. Let\u2019s move on! \u2705';
    return {
      message: forceMessage,
      widget: { type: 'free-text' },
      profileXml: currentProfileXml,
      complete: true,
    };
  }

  const xmlDefinition = await renderPrompt(PromptTemplate.ProfileXmlDefinition);
  const systemPrompt = await renderPrompt(PromptTemplate.IntakeXmlSystem, {
    XML_DEFINITION: xmlDefinition,
    LANGUAGE: language,
  });
  const intakeUserPrompt = await renderPrompt(PromptTemplate.IntakeXmlUser, {
    CHAT_HISTORY_JSON: JSON.stringify(args.chatHistory),
    PROFILE_JSON: currentProfileXml,
    QUESTION_NUMBER: questionNumber.toString(),
  });

  const obj = await chatJsonForStage(
    'intake',
    { system: systemPrompt, user: intakeUserPrompt },
    {
      message: "Let's start with your **GenAI toolkit** ✨\nWhich AI tools do you use *(daily/weekly/monthly)*?",
      widget: {
        type: 'multi-select',
        options: ['ChatGPT', 'Claude', 'GitHub Copilot', 'Gemini', 'Perplexity', 'Notion AI', 'Other'],
      },
      profileXml: currentProfileXml,
      complete: false,
    },
    logContext
  );

  if (typeof obj?.profileXml !== 'string' || !obj.profileXml.trim()) {
    obj.profileXml = currentProfileXml;
  }
  const targetField = (obj as any)?.targetField;
  obj.message = ensureStyledMessage(isFirstMessage ? addWarmWelcome(obj.message) : obj.message, targetField);
  return obj;
}

// PRD Spec: Performance Check - Score prompt with rubric (deterministic heuristic)
export const scorePrompt = action({
  args: {
    promptText: v.string(),
    inputType: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { logContext } = await prepareAuthenticatedLlmAction(ctx);

    return startActiveObservation(
      'action.scorePrompt',
      async (span) => {
        span.update({
          action: 'scorePrompt',
          prompt_length: args.promptText.length,
          inputType: args.inputType ?? 'prompt',
        });
        const language = args.language || 'English';
        const systemPrompt = await renderPrompt(PromptTemplate.ScoreSystem, {
          LANGUAGE: language,
        });

        const inputTypeHint = args.inputType === 'skill' ? '[INPUT TYPE: AI Skill/Configuration — evaluate for structure, reusability, parameterization, and clarity]\n' : '';
        const result = await chatJsonForStage<{
          score: number;
          feedback: string;
        }>(
          'scorePrompt',
          {
            system: systemPrompt,
            user: `${inputTypeHint}---PROMPT TO EVALUATE---\n${args.promptText}\n---END OF PROMPT---`,
          },
          {
            score: 0.5,
            feedback: 'Clear goal; add constraints and quality criteria.',
          },
          logContext
        );
        result.score = Math.max(0, Math.min(1, Number(result.score) || 0));
        if (typeof result.feedback !== 'string') result.feedback = '';
        span.update({ score: result.score });
        return result;
      },
      { asType: 'span' }
    );
  },
});

// Generate a concise, well-formatted Markdown assessment report
export const generateAssessmentReport = action({
  args: {
    chatHistory: v.array(chatMessageValidator),
    profileXml: v.string(),
    skillVerification: v.optional(
      v.object({
        performanceScore: v.number(),
        selfAssessment: v.number(),
        promptText: v.optional(v.string()),
        level: v.optional(v.string()),
        feedback: v.optional(v.string()),
        completedAt: v.optional(v.number()),
        inputType: v.optional(v.string()),
      })
    ),
    inferredAiFluency: v.optional(
      v.object({
        score: v.number(),
        justification: v.string(),
        inferredAt: v.optional(v.number()),
      })
    ),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { logContext } = await prepareAuthenticatedLlmAction(ctx);
    const language = args.language || DEFAULT_LANGUAGE_NAME;

    return startActiveObservation(
      'action.generateAssessmentReport',
      async (span) => {
        span.update({
          action: 'generateAssessmentReport',
          history_length: args.chatHistory.length,
          language,
        });

        const system = await renderPrompt(PromptTemplate.AssessmentXmlSystem, {
          LANGUAGE: language,
        });
        const user = await renderPrompt(PromptTemplate.AssessmentXmlUser, {
          PROFILE_XML: args.profileXml,
          SKILL_JSON: JSON.stringify(args.skillVerification || {}),
          CHAT_HISTORY_JSON: JSON.stringify(args.chatHistory),
          AI_FLUENCY_JSON: args.inferredAiFluency ? `AI Fluency Score: ${args.inferredAiFluency.score}/100\nJustification: ${args.inferredAiFluency.justification}` : '',
        });

        const result = await chatJsonForStage<{ report: string }>('assessment', { system, user }, { report: defaultAssessment(args.profileXml) }, logContext);

        if (typeof result?.report !== 'string' || !result.report.trim()) {
          return defaultAssessment(args.profileXml);
        }
        span.update({ report_length: result.report.length });
        return result.report;
      },
      { asType: 'span' }
    );
  },
});

function defaultAssessment(profileXml: string): string {
  const preview = (profileXml || '').trim().slice(0, 600);
  return `# Your Assessment\n\nA concise snapshot of your current AI usage and development needs.\n\n### 🧾 Profile Snapshot (XML)\n\n\`\`\`xml\n${preview}${preview.length >= 600 ? '\n…' : ''}\n\`\`\`\n\n### 🚀 Fast-Track Recommendations\n- Build momentum with two quick wins, then bridge to core goals.`;
}

export const generatePlaybook = action({
  args: {
    profileXml: v.string(),
    assessmentReport: v.optional(v.string()),
    skillVerification: v.optional(
      v.object({
        performanceScore: v.number(),
        selfAssessment: v.number(),
        promptText: v.optional(v.string()),
        level: v.optional(v.string()),
        feedback: v.optional(v.string()),
        completedAt: v.optional(v.number()),
        inputType: v.optional(v.string()),
      })
    ),
    language: v.optional(v.string()),
    videoEnhanced: v.optional(v.boolean()),
    inferredAiFluency: v.optional(
      v.object({
        score: v.number(),
        justification: v.string(),
        inferredAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { logContext } = await prepareAuthenticatedLlmAction(ctx);
    const language = args.language || DEFAULT_LANGUAGE_NAME;

    const videoEnhanced = args.videoEnhanced === true;

    return startActiveObservation(
      'action.generatePlaybook',
      async (span) => {
        span.update({
          action: 'generatePlaybook',
          has_assessment: Boolean(args.assessmentReport),
          language,
          videoEnhanced,
        });

        let videoCorpusSection = '';
        let videoInstructions = '';

        if (videoEnhanced) {
          videoInstructions = PLAYBOOK_VIDEO_INSTRUCTIONS;
          // Playbook generates all pages at once — use broader context and higher max
          videoCorpusSection = await loadAndPreselectCorpus({
            ctx,
            pageContext: args.assessmentReport || 'Full course outline generation',
            profileXml: args.profileXml,
            maxSegments: 30,
            logContext,
            headerLabel: 'VIDEO CORPUS (match relevant segments to outline modules):',
          });
        }

        const fluencySection = args.inferredAiFluency ? `AI Fluency Score: ${args.inferredAiFluency.score}/100\nJustification: ${args.inferredAiFluency.justification}` : '';

        const moduleHints = buildModuleHints(args.profileXml);

        const systemPrompt = await renderPrompt(PromptTemplate.PlaybookXmlSystem, {
          LANGUAGE: language,
          VIDEO_INSTRUCTIONS: videoInstructions,
          EDITORIAL_GUIDE: EDITORIAL_GUIDE_SECTION,
          CURRENT_DATE: new Date().toISOString().slice(0, 10),
        });
        const userPrompt = await renderPrompt(PromptTemplate.PlaybookXmlUser, {
          PROFILE_XML: args.profileXml,
          SKILL_JSON: JSON.stringify(args.skillVerification || {}, null, 2),
          ASSESSMENT_MD: args.assessmentReport || 'Not available',
          VIDEO_CORPUS: videoCorpusSection,
          AI_FLUENCY_JSON: fluencySection,
          MODULE_HINTS_JSON: moduleHints,
        });

        const fallback = defaultPlaybook('Leader');
        const { data: result, sources } = await chatJsonForStageWithSources<any>('playbook', { system: systemPrompt, user: userPrompt }, fallback, logContext);
        const finalPlan = result || fallback;
        span.update({
          outline_pages: Array.isArray(finalPlan?.outline) ? finalPlan.outline.length : 0,
          web_search_sources: sources.length,
        });
        return { ...finalPlan, searchSources: sources };
      },
      { asType: 'span' }
    );
  },
});

function defaultPlaybook(role: string) {
  return {
    outline: [
      {
        page: 1,
        title: 'Executive One-Pager',
        summary: `Snapshot of priorities for ${role}`,
        teasers: ['4 frameworks', 'From prompts to outcomes'],
        cta: 'Unlock full playbook',
      },
      {
        page: 2,
        title: 'Translator Framework',
        summary: 'Turn messy notes into assets',
        teasers: ['Cascade prompts', 'Persona overlays'],
      },
      {
        page: 3,
        title: 'Flash Evaluation',
        summary: 'Iterate faster with critique prompts',
        teasers: ['Assumption checks', 'Inline editing'],
      },
      {
        page: 4,
        title: 'Automation in 10 Minutes',
        summary: 'Apps Scripts with Gemini',
        teasers: ['Gmail triage', 'Calendar brief'],
      },
      {
        page: 5,
        title: 'Safety & Next Steps',
        summary: 'Guardrails + roadmap',
        teasers: ['PII hygiene', 'Next workshop idea'],
      },
    ],
    fullPlan: [],
    metadata: {
      title: `AI Playbook for ${role}`,
      language: 'EN',
      profileFit: {},
    },
  };
}

// Debug action to list all prompts and their content (admin only)
export const debugListPrompts = action({
  args: {},
  returns: v.object({
    useLangfusePrompts: v.boolean(),
    prompts: v.array(
      v.object({
        template: v.string(),
        langfuseName: v.string(),
        type: v.string(),
        hasLangfuseVersion: v.boolean(),
        langfuseContent: v.optional(v.string()),
        fallbackPreview: v.string(),
      })
    ),
  }),
  handler: async (ctx) => {
    // Admin only - debug functionality
    await assertAdmin(ctx);

    const configs = getPromptConfigs();
    const prompts = [];

    for (const config of configs) {
      let langfuseContent: string | null = null;
      let hasLangfuseVersion = false;

      if (USE_LANGFUSE_PROMPTS) {
        try {
          const prompt = await fetchPrompt(config.name, { type: config.type as 'text' | 'chat' });
          if (prompt?.prompt) {
            hasLangfuseVersion = true;
            langfuseContent = typeof prompt.prompt === 'string' ? prompt.prompt : JSON.stringify(prompt.prompt);
          }
        } catch {
          // Langfuse fetch failed, will use fallback
        }
      }

      prompts.push({
        template: config.template,
        langfuseName: config.name,
        type: config.type,
        hasLangfuseVersion,
        langfuseContent: langfuseContent || undefined,
        fallbackPreview: config.fallback.slice(0, 200) + (config.fallback.length > 200 ? '...' : ''),
      });
    }

    return { useLangfusePrompts: USE_LANGFUSE_PROMPTS, prompts };
  },
});

// Infer AI fluency score (0-100) from profile and chat history
export const inferAiFluency = action({
  args: {
    profileXml: v.string(),
    chatHistory: v.array(chatMessageValidator),
    language: v.optional(v.string()),
  },
  returns: v.object({
    score: v.number(),
    justification: v.string(),
  }),
  handler: async (ctx, args) => {
    const { logContext } = await prepareAuthenticatedLlmAction(ctx);

    return startActiveObservation(
      'action.inferAiFluency',
      async (span) => {
        span.update({
          action: 'inferAiFluency',
          profile_length: args.profileXml.length,
        });

        const systemPrompt = await renderPrompt(PromptTemplate.InferAiFluencySystem, {
          LANGUAGE: args.language || 'English',
        });
        const userPrompt = await renderPrompt(PromptTemplate.InferAiFluencyUser, {
          PROFILE_XML: args.profileXml,
          CHAT_HISTORY_JSON: JSON.stringify(args.chatHistory),
        });

        const result = await chatJsonForStage<{
          score: number;
          justification: string;
        }>(
          'inferAiFluency',
          { system: systemPrompt, user: userPrompt },
          {
            score: 50,
            justification: 'Unable to infer fluency from available data.',
          },
          logContext
        );

        // Clamp score to 0-100
        result.score = Math.max(0, Math.min(100, Math.round(Number(result.score) || 50)));
        if (typeof result.justification !== 'string') {
          result.justification = '';
        }

        span.update({ score: result.score });
        return result;
      },
      { asType: 'span' }
    );
  },
});
