/**
 * Condensed editorial style guide for LLM consumption.
 * Sources: docs/editorial_style_guide.md, docs/language_spokes_pl_de.md
 */

export const EDITORIAL_STYLE_GUIDE = `Voice: "Guide on the Side" — expert mentor, not lecturer. Training content uses 2nd person ("You"), direct coaching tone. Use "We" sparingly for hints or nudges. Use "AITutoro" for technology capabilities; use "We" for educational philosophy.

Philosophy: Assume the user is intelligent but busy — do not describe the obvious. If a pun or idiom obscures meaning, delete it.

Structural Mechanics:
- Sentences: Short, punchy, active voice only.
- Paragraphs: 1–2 sentences max.
- Scannability: Reader extracts 80% of value from 20% of text. Use bold for key takeaways.
- Bullet points: Capital letter start, period end, parallel structure (all start with a verb).

Vocabulary Guardrails:
- No fillers: eliminate "very," "actually," "basically," "just."
- No shallow adjectives: avoid "cutting-edge," "world-class."
- Concept-first definitions: use the precise term, then plain-language meaning immediately.

Brand: "AITutoro" (no space). Sentence case for headlines, UI elements, labels. Question headlines encouraged when they mirror the learner's inquiry.

Numerals: In data/metrics use Arabic numerals (15%, 5 units). In instructional prose spell out one through nine, Arabic for 10+.

Links: Descriptive only. Never "click here" or "read more."
Buttons: Max 4 words, verb-first, action-oriented (e.g., "Start next module").

Code Snippets:
- Always specify language for syntax highlighting.
- Comments focus on "Why," not obvious syntax.
- Max 20 lines per snippet; break longer blocks with prose.
- Descriptive variable/function names; no cryptic abbreviations.
- Use backticks for inline variables or commands.
- When showing before/after, highlight what changed with comments like "# Updated."

Prompt & AI Interaction Examples (when showing how to communicate with AI):
- Show clear, natural prompts — write them like you would talk to a knowledgeable colleague.
- No rigid templates. Modern models understand natural language; formulaic Role/Context/Task structures are unnecessary and teach the wrong mental model.
- Use before/after pairs to show improvement: "before" is vague or ambiguous, "after" is specific and clear — but still natural language, not a form to fill in.
- Vary the form based on topic: a natural prompt, a system instruction, a tool configuration, an agent workflow — pick what fits.
- If the topic involves AI tools, orchestration, or agents — teach configuration and integration, not "how to write a prompt template."
- Use {{PLACEHOLDERS}} sparingly, only when showing reusable patterns. Prefer concrete examples over abstract slots.

Quality Tests:
- "So What?" — if a sentence doesn't help the user achieve their goal, cut it.
- "Mobile Test" — if a paragraph fills >50% of a mobile screen, break it up.

Language-Specific Rules:
- Polish: Address as "Ty" (informal, never "Pan/Pani"). "AITutoro" is indeclinable — no suffixes ("z AITutoro" not "z AITutora"). Minimize possessive "Twoje/Twój" — omit when ownership is implied. Active voice only — avoid passive "zostało zrobione."
- German: Address as "Du" (informal, never "Sie"). "AITutoro" is indeclinable — no genitive "-s" ("von AITutoro" not "AITutoros"). Nouns stay capitalized (overrides sentence-case rule). Hyphenate compound nouns for scannability ("KI-Training" not "Künstlicheintelligenztraining"). Use imperative for UI actions. Strictly enforce short paragraphs — German text expands.`;

/**
 * Editorial guide wrapped in a section header,
 * ready for injection into LLM system prompts.
 */
export const EDITORIAL_GUIDE_SECTION = `## Editorial Style Guide\nApply to ALL generated content.\n\n${EDITORIAL_STYLE_GUIDE}`;
