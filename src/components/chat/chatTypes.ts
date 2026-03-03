export type WidgetType = 'single-select' | 'multi-select' | 'likert' | 'free-text';

export type ChatMessageRecord = {
  id: string;
  type: 'question' | 'answer';
  content: string;
  widgetType?: WidgetType;
  options?: string[];
  answer?: string | string[] | number;
  timestamp: number;
};

// Keep only fields accepted by Convex validator for chatHistory
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts unknown shapes from LLM/DB
export function sanitizeHistoryMessage(msg: any): ChatMessageRecord {
  const out: ChatMessageRecord = {
    id: safeString(msg?.id) || `m-${Date.now()}`,
    type: msg?.type === 'question' ? 'question' : 'answer',
    content: safeString(msg?.content),
    timestamp: safeNumber(msg?.timestamp) ?? Date.now(),
  } as ChatMessageRecord;

  const wt = msg?.widgetType as WidgetType | undefined;
  if (wt === 'single-select' || wt === 'multi-select' || wt === 'likert' || wt === 'free-text') {
    out.widgetType = wt;
  }

  if (Array.isArray(msg?.options)) {
    out.options = msg.options.filter((x: unknown) => typeof x === 'string');
  }

  const a = msg?.answer;
  if (typeof a === 'string' || typeof a === 'number' || (Array.isArray(a) && a.every((x) => typeof x === 'string'))) {
    out.answer = a;
  }

  return out;
}

function safeString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function safeNumber(v: unknown): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && !isNaN(n) ? n : undefined;
}
