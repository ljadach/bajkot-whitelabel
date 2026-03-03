# Prompt Formatting Policy

All LLM prompts in `convex/lib/prompts.ts` follow the conventions below.

## Why Markdown

LLMs are trained on vast amounts of Markdown. Using `#`/`##` headers creates a logical tree the model can parse reliably — much clearer than ALL_CAPS labels or bold-as-headers. Gemini models parse Markdown headers the same way.

## Structure conventions

| Element | Syntax | Example |
|---|---|---|
| Top-level section | `#` | `# Role` |
| Subsection | `##` | `## Output Format` |
| List items | `- ` | `- Rule one` |
| Code / JSON examples | ` ``` ` fenced blocks | ` ```json { ... } ``` ` |
| Variables | `{{UPPER_SNAKE}}` | `{{PROFILE_XML}}` |

## Variables

- Use `{{PLACEHOLDER}}` — uppercase letters + underscores.
- Variables are replaced at runtime by `renderPrompt()`.
- Every placeholder used in a template must have a matching key in the template's Zod schema.

## XML in prompts

XML is allowed **only** as injected data (e.g. user profile, video corpus). The prompt's own structure must be Markdown, not XML.

## Do

- Start system prompts with `# Role` or a one-line role declaration.
- Use `## Task`, `## Output Format`, `## Rules`, `## Examples` as standard sections.
- Use `-` for flat lists, `1.` for ordered steps.
- Use ` ``` ` fenced blocks for JSON schemas and examples.
- Keep lines flush-left (no leading whitespace).

## Do not

- Use ALL_CAPS labels like `RULES:`, `OUTPUT FORMAT:` — replace with `## Rules`, `## Output Format`.
- Use **bold text** as section headers — use `##` instead.
- Add 2-space indentation to entire blocks.
- Mix formatting styles within a single prompt.

## Gemini-specific notes

Gemini Flash models parse Markdown headers as a logical tree. Use `##` subsections to group related instructions — the model treats them as scoped context.

## Reference prompts

`VideoSegmentExtractionSystem` and `VideoTeachingSegmentSystem` in `prompts.ts` already follow this policy and serve as canonical examples.
