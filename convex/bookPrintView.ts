/**
 * Public query for the client-side book print view.
 * Returns all data needed to render a printable booklet:
 * order metadata, parsed artifacts, and illustration URLs.
 */

import { query } from './_generated/server';
import { v } from 'convex/values';
import { assertOrderOwner } from './lib/roles';
import type {
  StoryDraft,
  StoryBlueprint,
  CharacterProfile,
  IllustrationPlan,
} from './lib/bookTypes';

export const getBookPrintData = query({
  args: { orderId: v.id('bookOrders') },
  returns: v.any(),
  handler: async (ctx, { orderId }) => {
    const order = await assertOrderOwner(ctx, orderId);

    // Parse JSON artifacts (gracefully handle missing/corrupt)
    const safeParse = <T>(json: string | undefined | null): T | null => {
      if (!json) return null;
      try {
        return JSON.parse(json) as T;
      } catch {
        return null;
      }
    };

    const storyDraft = safeParse<StoryDraft>(order.storyDraft);
    const characterProfile = safeParse<CharacterProfile>(order.characterProfile);
    const storyBlueprint = safeParse<StoryBlueprint>(order.storyBlueprint);
    const illustrationPlan = safeParse<IllustrationPlan>(order.illustrationPlan);

    // Fetch illustrations with storage URLs
    const illustrations = await ctx.db
      .query('bookIllustrations')
      .withIndex('by_order', (q) => q.eq('orderId', orderId))
      .collect();

    const illustrationsWithUrls = await Promise.all(
      illustrations.map(async (ill) => ({
        illustrationId: ill.illustrationId,
        sceneRef: ill.sceneRef ?? null,
        url: ill.storageId ? await ctx.storage.getUrl(ill.storageId) : null,
      })),
    );

    return {
      order: {
        childName: order.childName,
        ageBracket: order.ageBracket,
        gender: order.gender,
        problemId: order.problemId,
      },
      storyDraft,
      characterProfile,
      storyBlueprint,
      illustrationPlan,
      illustrations: illustrationsWithUrls,
    };
  },
});
