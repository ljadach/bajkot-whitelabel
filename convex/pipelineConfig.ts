import { query } from './_generated/server';
import { v } from 'convex/values';
import { assertAdmin } from './lib/roles';
import { getLlmConfig, type PipelineStage } from './lib/pipelineConfig';

export const getPipeline = query({
  args: {},
  returns: v.object({
    profile: v.string(),
    stages: v.array(
      v.object({
        stage: v.string(),
        model: v.string(),
        temperature: v.number(),
        retries: v.number(),
        baseDelayMs: v.number(),
        webSearch: v.optional(v.object({ enabled: v.literal(true), maxResults: v.number() })),
        reasoning: v.optional(v.boolean()),
        expect: v.optional(v.union(v.literal('object'), v.literal('array'), v.literal('any'))),
      })
    ),
  }),
  handler: async (ctx) => {
    await assertAdmin(ctx);

    const profile = process.env.LLM_CONFIG_PROFILE || 'prod';
    const config = getLlmConfig();

    const stages = (Object.entries(config) as [PipelineStage, (typeof config)[PipelineStage]][]).map(([stage, cfg]) => ({
      stage,
      model: cfg.model,
      temperature: cfg.temperature,
      retries: cfg.retries,
      baseDelayMs: cfg.baseDelayMs,
      ...(cfg.webSearch ? { webSearch: cfg.webSearch } : {}),
      ...(cfg.reasoning !== undefined ? { reasoning: cfg.reasoning } : {}),
      ...(cfg.expect ? { expect: cfg.expect } : {}),
    }));

    return { profile, stages };
  },
});
