import { action } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { EDITORIAL_GUIDE_SECTION } from './lib/editorialGuide';
import { startActiveObservation } from './lib/langfuse';
import { chatJsonForStage } from './lib/llmClient';
import { prepareAuthenticatedLlmAction } from './lib/actionHelpers';
import { DEFAULT_LANGUAGE_NAME } from './lib/language';
import { extractFirst } from './lib/profileXml';

export const generateDiaryEntry = action({
  args: {
    profileXml: v.string(),
    planOutline: v.string(),
    language: v.optional(v.string()),
  },
  returns: v.object({
    title: v.string(),
    content: v.string(),
  }),
  handler: async (ctx, args) => {
    const { clerkUserId, logContext } = await prepareAuthenticatedLlmAction(ctx);
    const language = args.language || DEFAULT_LANGUAGE_NAME;

    return startActiveObservation(
      'action.generateDiaryEntry',
      async (span) => {
        span.update({
          action: 'generateDiaryEntry',
          profileLength: args.profileXml.length,
          language,
        });

        // Deprecated: diary entry feature removed from plan page.
        // Inline prompts kept for backward compatibility if action is called directly.
        const systemPrompt = `You are a witty AI ghostwriter. Write a short humorous diary entry in ${language}.\n\n${EDITORIAL_GUIDE_SECTION}`;
        const userPrompt = `Profile:\n${args.profileXml}\n\nPlan:\n${args.planOutline || 'No plan outline available.'}\n\nReturn JSON with "title" and "content" fields only.`;

        const fallback = generateFallbackDiary(args.profileXml);

        try {
          const data = await chatJsonForStage<{ title?: string; content?: string }>('diaryEntry', { system: systemPrompt, user: userPrompt }, fallback, logContext);

          const title = (typeof data.title === 'string' ? data.title.trim() : '') || 'My AI journey so far';
          const content = (typeof data.content === 'string' ? data.content.trim() : '') || title;

          span.update({
            titleLength: title.length,
            contentLength: content.length,
          });

          await ctx.runMutation(internal.diaryEntryAiHelpers.saveDiaryEntry, {
            clerkUserId,
            title,
            content,
          });

          return { title, content };
        } catch (error) {
          console.error('[diaryEntryAi] Error generating diary entry:', error);

          await ctx.runMutation(internal.diaryEntryAiHelpers.saveDiaryEntry, {
            clerkUserId,
            title: fallback.title,
            content: fallback.content,
          });

          return fallback;
        }
      },
      { asType: 'span' }
    );
  },
});

function generateFallbackDiary(profileXml: string): { title: string; content: string } {
  const role = extractFirst(profileXml, 'role') || 'professional';

  return {
    title: `Confessions of an AI-powered ${role}`,
    content: `**Dear diary,**

Six months ago I thought "prompt engineering" was something you did with a mechanical pencil.

Today I automated half my weekly reports and my boss thinks I hired a ghost assistant. **I did not correct that assumption.**

The turning point? Realizing that talking to AI is less "magic spell" and more "really detailed email to a brilliant intern."

My colleagues still copy-paste one-liners into ChatGPT and wonder why the output reads like a Wikipedia article written by a committee. Meanwhile, I structure my prompts like I structure my morning — with intention and the right amount of caffeine.

**The scoreboard so far:**
- Hours saved per week: enough to finally learn that Excel shortcut I've been ignoring for 3 years
- Quality of AI outputs: went from "cute attempt" to "wait, did a human write this?"
- Confidence in team meetings about AI: through the roof (and occasionally the ceiling)

Would I do it again? In a heartbeat. Except maybe I'd start sooner and panic less.

*Signed, a ${role} who now actually looks forward to Mondays (don't tell anyone).*`,
  };
}
