'use node';

import { ConvexError, v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';
import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { assertAdmin } from './lib/roles';
import { getStageConfig } from './lib/pipelineConfig';

const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const openrouter = openrouterApiKey ? createOpenRouter({ apiKey: openrouterApiKey }) : null;

const MAX_CUSTOM_PERSONA_LENGTH = 2_000;
const MAX_CURRENT_QUESTION_LENGTH = 1_000;
const MAX_CHAT_HISTORY_MESSAGES = 200;
const MAX_CHAT_HISTORY_MESSAGE_LENGTH = 1_000;
const MAX_OPTIONS_COUNT = 20;
const MAX_OPTION_LENGTH = 300;

/**
 * Predefined personas for auto-fill chat testing.
 */
export const PERSONAS = {
  cto: {
    id: 'cto',
    name: 'CTO - Chief Technology Officer',
    description: `You are a CTO (Chief Technology Officer) at a mid-size tech company (200 employees).
- 15+ years of experience in software development
- Expert in AI/ML, cloud architecture, DevOps
- Uses ChatGPT Plus daily, Claude Pro, GitHub Copilot
- Creates technical documentation, architecture diagrams, code reviews
- Wants to learn advanced prompt engineering to improve team productivity
- Time available: 2-3 hours per week
- Speaks fluent English
- Prefers hands-on learning with real examples`,
  },
  cfo: {
    id: 'cfo',
    name: 'CFO - Chief Financial Officer',
    description: `You are a CFO (Chief Financial Officer) at a manufacturing company.
- 20 years of experience in finance and accounting
- Uses Excel extensively, some experience with BI tools
- Just started using ChatGPT (free tier) for financial analysis
- Creates financial reports, budgets, forecasts, presentations
- Wants to learn how AI can help with financial modeling and analysis
- Time available: 1 hour per week
- Speaks English and Polish
- Prefers structured learning with clear outcomes`,
  },
  plumber: {
    id: 'plumber',
    name: 'Hydraulik / Plumber',
    description: `You are a self-employed plumber running a small business.
- 10 years of experience in plumbing
- Uses smartphone for everything, not very tech-savvy
- Heard about AI but never used it
- Creates quotes, invoices, schedules appointments
- Wants to learn how AI can help run the business better
- Time available: 30 minutes per week
- Speaks Polish primarily, basic English
- Prefers simple, practical examples`,
  },
  marketer: {
    id: 'marketer',
    name: 'Marketing Manager',
    description: `You are a Marketing Manager at an e-commerce startup.
- 7 years of experience in digital marketing
- Uses Jasper AI, ChatGPT, Midjourney regularly
- Creates ad copy, social media content, email campaigns, landing pages
- Expert in SEO, SEM, content marketing
- Wants to master advanced AI workflows for content production
- Time available: 4 hours per week
- Speaks English fluently
- Prefers fast-paced, project-based learning`,
  },
} as const;

export type PersonaId = keyof typeof PERSONAS;

function validateAutoFillInput(args: { customPersona?: string; currentQuestion: string; chatHistory: Array<{ type: string; content: string }>; options?: string[] }) {
  if (args.customPersona && args.customPersona.length > MAX_CUSTOM_PERSONA_LENGTH) {
    throw new ConvexError({
      code: 'INVALID_ARGUMENT',
      field: 'customPersona',
      message: `customPersona exceeds max length (${MAX_CUSTOM_PERSONA_LENGTH})`,
    });
  }

  if (args.currentQuestion.length > MAX_CURRENT_QUESTION_LENGTH) {
    throw new ConvexError({
      code: 'INVALID_ARGUMENT',
      field: 'currentQuestion',
      message: `currentQuestion exceeds max length (${MAX_CURRENT_QUESTION_LENGTH})`,
    });
  }

  if (args.chatHistory.length > MAX_CHAT_HISTORY_MESSAGES) {
    throw new ConvexError({
      code: 'INVALID_ARGUMENT',
      field: 'chatHistory',
      message: `chatHistory exceeds max entries (${MAX_CHAT_HISTORY_MESSAGES})`,
    });
  }

  for (const [index, message] of args.chatHistory.entries()) {
    if (message.content.length > MAX_CHAT_HISTORY_MESSAGE_LENGTH) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        field: `chatHistory[${index}].content`,
        message: `chat history message exceeds max length (${MAX_CHAT_HISTORY_MESSAGE_LENGTH})`,
      });
    }
  }

  if (args.options && args.options.length > MAX_OPTIONS_COUNT) {
    throw new ConvexError({
      code: 'INVALID_ARGUMENT',
      field: 'options',
      message: `options exceeds max entries (${MAX_OPTIONS_COUNT})`,
    });
  }

  if (args.options) {
    for (const [index, option] of args.options.entries()) {
      if (option.length > MAX_OPTION_LENGTH) {
        throw new ConvexError({
          code: 'INVALID_ARGUMENT',
          field: `options[${index}]`,
          message: `option exceeds max length (${MAX_OPTION_LENGTH})`,
        });
      }
    }
  }
}

/**
 * Generate an auto-fill response based on persona and conversation context.
 */
export const generateAutoFillResponse = action({
  args: {
    personaId: v.string(),
    customPersona: v.optional(v.string()),
    currentQuestion: v.string(),
    widgetType: v.string(),
    options: v.optional(v.array(v.string())),
    chatHistory: v.array(
      v.object({
        type: v.string(),
        content: v.string(),
      })
    ),
  },
  returns: v.object({
    response: v.string(),
    structured: v.optional(v.any()),
  }),
  handler: async (ctx, args) => {
    const { subject: clerkUserId } = await assertAdmin(ctx);

    await ctx.runMutation(internal.rateLimitMutation.checkAndRecordLLMRateLimit, {
      actionType: 'llm_call',
      clerkUserId,
    });

    validateAutoFillInput(args);

    if (!openrouter) {
      throw new Error('OpenRouter not configured. Set OPENROUTER_API_KEY.');
    }

    const { personaId, customPersona, currentQuestion, widgetType, options, chatHistory } = args;

    // Get persona description
    let personaDescription: string;
    if (customPersona && customPersona.trim()) {
      personaDescription = customPersona;
    } else if (personaId in PERSONAS) {
      personaDescription = PERSONAS[personaId as PersonaId].description;
    } else {
      personaDescription = PERSONAS.cto.description;
    }

    // Build conversation context
    const historyContext = chatHistory
      .slice(-10) // Last 10 messages for context
      .map((msg) => `${msg.type === 'question' ? 'Tutor' : 'You'}: ${msg.content}`)
      .join('\n');

    // Build the prompt
    const systemPrompt = `You are role-playing as a specific persona to help test an AI tutoring intake form.

PERSONA:
${personaDescription}

INSTRUCTIONS:
- Stay in character as this persona throughout
- Answer questions naturally as this person would
- Keep responses concise (1-3 sentences for free text, or select appropriate options)
- Be consistent with previous answers in the conversation
- If asked about AI tools, answer based on your persona's experience level
- If asked about learning goals, answer based on your persona's needs`;

    const userPrompt = buildUserPrompt(currentQuestion, widgetType, options, historyContext);

    // Call LLM
    const autoFillConfig = getStageConfig('autoFill');
    const result = await generateText({
      model: openrouter(autoFillConfig.model),
      temperature: autoFillConfig.temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const responseText = result.text ?? '';

    // Parse response based on widget type
    return parseResponse(responseText, widgetType, options);
  },
});

function buildUserPrompt(question: string, widgetType: string, options: string[] | undefined, historyContext: string): string {
  let prompt = '';

  if (historyContext) {
    prompt += `CONVERSATION SO FAR:\n${historyContext}\n\n`;
  }

  prompt += `CURRENT QUESTION: ${question}\n\n`;

  if (widgetType === 'single-select' && options && options.length > 0) {
    prompt += `AVAILABLE OPTIONS (choose exactly one):\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}\n\n`;
    prompt += `Respond with ONLY the exact text of one option, nothing else.`;
  } else if (widgetType === 'multi-select' && options && options.length > 0) {
    prompt += `AVAILABLE OPTIONS (choose one or more that apply):\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}\n\n`;
    prompt += `Respond with ONLY the exact text of chosen options, one per line, nothing else.`;
  } else if (widgetType === 'likert') {
    prompt += `This is a scale question (1-5). Respond with ONLY a number from 1 to 5.`;
  } else {
    prompt += `Respond naturally as your persona would. Keep it concise (1-3 sentences).`;
  }

  return prompt;
}

function parseResponse(response: string, widgetType: string, options: string[] | undefined): { response: string; structured?: any } {
  const text = response.trim();

  if (widgetType === 'single-select' && options) {
    // Find the matching option
    const match = options.find((o) => o.toLowerCase() === text.toLowerCase() || text.toLowerCase().includes(o.toLowerCase()));
    if (match) {
      return { response: match, structured: match };
    }
    // Fallback: return first option
    return { response: options[0], structured: options[0] };
  }

  if (widgetType === 'multi-select' && options) {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const matches = lines.map((line) => options.find((o) => o.toLowerCase() === line.toLowerCase() || line.toLowerCase().includes(o.toLowerCase()))).filter(Boolean) as string[];
    if (matches.length > 0) {
      return { response: matches.join(', '), structured: matches };
    }
    // Fallback: return first option
    return { response: options[0], structured: [options[0]] };
  }

  if (widgetType === 'likert') {
    const num = parseInt(text.match(/[1-5]/)?.[0] || '3', 10);
    return { response: num.toString(), structured: num };
  }

  // Free text
  return { response: text };
}
