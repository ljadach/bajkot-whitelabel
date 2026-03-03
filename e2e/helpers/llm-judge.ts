import OpenAI from 'openai';
import { getOpenRouterApiKey } from './env';

export interface JudgeVerdict {
  pass: boolean;
  score: number; // 0-100
  reasoning: string;
}

const JUDGE_SYSTEM_PROMPT = `You are a strict quality judge for AI-generated educational content.
You will receive content and evaluation criteria.
Score the content from 0 to 100 based on how well it meets the criteria.

Respond ONLY with valid JSON in this exact format:
{"pass": true, "score": 75, "reasoning": "Brief explanation"}

- pass: true if score >= threshold (provided in user message), false otherwise
- score: integer 0-100
- reasoning: 1-2 sentences explaining your assessment`;

const JUDGE_MODEL = 'google/gemini-2.0-flash-001';
const JUDGE_TIMEOUT_MS = 30_000;

export async function assertWithLlm(options: {
  content: string;
  criteria: string;
  threshold?: number;
}): Promise<JudgeVerdict> {
  const { content, criteria, threshold = 60 } = options;

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required for LLM judge assertions');
  }

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  });

  const userMessage = `Evaluation threshold: ${threshold}/100

CRITERIA:
${criteria}

CONTENT TO EVALUATE:
${content.slice(0, 8000)}`;

  const response = await client.chat.completions.create(
    {
      model: JUDGE_MODEL,
      messages: [
        { role: 'system', content: JUDGE_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0,
      max_tokens: 300,
    },
    { timeout: JUDGE_TIMEOUT_MS },
  );

  const raw = response.choices[0]?.message?.content?.trim() ?? '';

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`LLM Judge returned unparseable response: ${raw}`);
  }

  let parsed: { score: number; reasoning: string };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`LLM Judge returned unparseable response: ${raw}`);
  }

  const verdict: JudgeVerdict = {
    pass: parsed.score >= threshold,
    score: parsed.score,
    reasoning: parsed.reasoning,
  };

  console.log(`[LLM Judge] Score: ${verdict.score}/100 (threshold: ${threshold}) — ${verdict.pass ? 'PASS' : 'FAIL'}`);
  console.log(`[LLM Judge] Reasoning: ${verdict.reasoning}`);

  return verdict;
}
