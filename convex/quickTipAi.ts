import { action } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { renderPrompt, PromptTemplate } from './lib/prompts';
import { EDITORIAL_GUIDE_SECTION } from './lib/editorialGuide';
import { startActiveObservation } from './lib/langfuse';
import { chatJsonForStageWithSources } from './lib/llmClient';
import { prepareAuthenticatedLlmAction } from './lib/actionHelpers';
import { DEFAULT_LANGUAGE_NAME } from './lib/language';
import { extractFirst } from './lib/profileXml';

// Generate a personalized quick tip using OpenRouter web search
export const generateQuickTip = action({
  args: {
    profileXml: v.string(),
    chatSummary: v.string(),
    performanceScore: v.optional(v.number()),
    fluencyScore: v.optional(v.number()),
    language: v.optional(v.string()),
  },
  returns: v.object({
    hook: v.string(),
    content: v.string(),
    sources: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const { clerkUserId, logContext } = await prepareAuthenticatedLlmAction(ctx);
    const language = args.language || DEFAULT_LANGUAGE_NAME;

    return startActiveObservation(
      'action.generateQuickTip',
      async (span) => {
        span.update({
          action: 'generateQuickTip',
          profileLength: args.profileXml.length,
          language,
        });

        const systemPrompt = await renderPrompt(PromptTemplate.QuickTipSystem, {
          LANGUAGE: language,
          EDITORIAL_GUIDE: EDITORIAL_GUIDE_SECTION,
        });
        const userPrompt = await renderPrompt(PromptTemplate.QuickTipUser, {
          PROFILE_XML: args.profileXml,
          CHAT_SUMMARY: args.chatSummary || 'No conversation summary available.',
          PERFORMANCE_SCORE: args.performanceScore?.toString() || 'Not evaluated',
          FLUENCY_LEVEL: args.fluencyScore ? (args.fluencyScore >= 70 ? 'Advanced' : args.fluencyScore >= 40 ? 'Intermediate' : 'Beginner') : 'Not evaluated',
        });

        try {
          const fallbackTip = generateFallbackTip(args.profileXml);

          const { data, sources } = await chatJsonForStageWithSources<{ hook?: string; content?: string }>('quickTip', { system: systemPrompt, user: userPrompt }, fallbackTip, logContext);

          const hook = (typeof data.hook === 'string' ? data.hook.trim() : '') || 'A personalized tip for you';
          const content = (typeof data.content === 'string' ? data.content.trim() : '') || hook;

          span.update({
            hookLength: hook.length,
            contentLength: content.length,
            sourcesCount: sources.length,
          });

          await ctx.runMutation(internal.quickTipAiHelpers.saveQuickTip, {
            clerkUserId,
            hook,
            content,
            sources,
          });

          return { hook, content, sources };
        } catch (error) {
          console.error('[quickTipAi] Error generating quick tip:', error);

          const fallbackTip = generateFallbackTip(args.profileXml);

          await ctx.runMutation(internal.quickTipAiHelpers.saveQuickTip, {
            clerkUserId,
            hook: fallbackTip.hook,
            content: fallbackTip.content,
            sources: [],
          });

          return {
            hook: fallbackTip.hook,
            content: fallbackTip.content,
            sources: [],
          };
        }
      },
      { asType: 'span' }
    );
  },
});

function generateFallbackTip(profileXml: string): { hook: string; content: string } {
  const role = extractFirst(profileXml, 'role') || 'professional';

  return {
    hook: `The 4-part prompt framework that works for every ${role}`,
    content: `**Most prompts fail because they're missing context.** The difference between a mediocre AI response and a brilliant one often comes down to four key elements.

**Here's the CTFC framework:**

1. **Context** — Set the scene with relevant background
2. **Task** — Be crystal clear about what you need
3. **Format** — Describe exactly how you want the output
4. **Constraints** — Add boundaries and requirements

**Try this now:** Take your next AI task and write it using CTFC. Compare the result to your usual approach—you'll see the difference immediately.`,
  };
}
