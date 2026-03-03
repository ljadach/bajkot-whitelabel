import { v } from 'convex/values';
import { action } from './_generated/server';
import { chatJsonForStage } from './lib/llmClient';
import { prepareAuthenticatedLlmAction } from './lib/actionHelpers';

export const answerExploreQuery = action({
  args: {
    query: v.string(),
    chapterContent: v.string(),
    profileXml: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { logContext } = await prepareAuthenticatedLlmAction(ctx);

    const result = await chatJsonForStage<{ answer: string }>(
      'exploreQa',
      {
        system:
          'You are a helpful learning assistant. The learner is reading a training chapter and has a question. Answer concisely (2-4 sentences) based on the chapter content. If the question asks you to do something creative (like design an application, compress ideas, etc.), do it briefly. Return JSON: { "answer": "<string>" }',
        user: `## Chapter Content\n${args.chapterContent.slice(0, 3000)}\n\n${args.profileXml ? `## Learner Profile\n${args.profileXml.slice(0, 500)}\n\n` : ''}## Question\n${args.query}`,
      },
      { answer: 'I could not generate an answer right now. Please try again.' },
      logContext
    );

    return result.answer;
  },
});
