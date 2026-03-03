/**
 * Debug utility for dumping all prompts (Langfuse + fallback).
 * Run via: npx convex run admin/debugPrompts:dumpAll
 *
 * Returns each prompt template with its compiled content, source (langfuse/fallback),
 * and character count — useful for Claude Code context injection.
 */
import { internalAction } from '../_generated/server';
import { v } from 'convex/values';
import { getPromptConfigs, renderPrompt, PromptTemplate } from '../lib/prompts';

export const dumpAll = internalAction({
  args: {},
  returns: v.string(),
  handler: async () => {
    const configs = getPromptConfigs();
    const lines: string[] = ['=== PROMPT DUMP ===', ''];

    for (const config of configs) {
      const template = config.template as PromptTemplate;
      let content: string;
      let source: string;

      try {
        // renderPrompt tries Langfuse first, falls back to inline
        // Pass empty params — placeholders will remain as {{VAR}}
        content = config.fallback;
        source = 'fallback';

        // Try Langfuse fetch (will fail for templates needing params, that's OK)
        try {
          const rendered = await renderPrompt(template);
          if (rendered !== content) {
            content = rendered;
            source = 'langfuse';
          }
        } catch {
          // Needs params — use fallback as-is
        }
      } catch {
        content = '(failed to load)';
        source = 'error';
      }

      lines.push(`--- ${config.template} [${source}] [${config.name}] [${content.length} chars] ---`);
      lines.push(content);
      lines.push('');
    }

    const output = lines.join('\n');
    console.log(output);
    return output;
  },
});

/** Dump a single prompt by template name. */
export const dumpOne = internalAction({
  args: { template: v.string() },
  returns: v.string(),
  handler: async (_, { template }) => {
    const configs = getPromptConfigs();
    const config = configs.find((c) => c.template === template);
    if (!config) {
      return `Template "${template}" not found. Available: ${configs.map((c) => c.template).join(', ')}`;
    }

    try {
      const rendered = await renderPrompt(template as PromptTemplate);
      return `--- ${config.template} [${config.name}] [${rendered.length} chars] ---\n${rendered}`;
    } catch {
      return `--- ${config.template} [fallback] [${config.fallback.length} chars] ---\n${config.fallback}`;
    }
  },
});
