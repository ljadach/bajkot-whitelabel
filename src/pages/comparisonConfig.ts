export interface ComparisonConfig {
  slug: string;
  namespace: string;
  toolA: string;
  toolB: string;
  canonicalPath: string;
  related: string[];
}

export const COMPARISON_REGISTRY: Record<string, ComparisonConfig> = {
  'chatgpt-vs-claude': {
    slug: 'chatgpt-vs-claude',
    namespace: 'compare-chatgpt-vs-claude',
    toolA: 'ChatGPT',
    toolB: 'Claude',
    canonicalPath: '/ai-tools/compare/chatgpt-vs-claude',
    related: [],
  },
  'chatgpt-vs-copilot': {
    slug: 'chatgpt-vs-copilot',
    namespace: 'compare-chatgpt-vs-copilot',
    toolA: 'ChatGPT',
    toolB: 'Copilot',
    canonicalPath: '/ai-tools/compare/chatgpt-vs-copilot',
    related: [],
  },
  'chatgpt-vs-gemini': {
    slug: 'chatgpt-vs-gemini',
    namespace: 'compare-chatgpt-vs-gemini',
    toolA: 'ChatGPT',
    toolB: 'Gemini',
    canonicalPath: '/ai-tools/compare/chatgpt-vs-gemini',
    related: [],
  },
  'claude-vs-gemini': {
    slug: 'claude-vs-gemini',
    namespace: 'compare-claude-vs-gemini',
    toolA: 'Claude',
    toolB: 'Gemini',
    canonicalPath: '/ai-tools/compare/claude-vs-gemini',
    related: [],
  },
  'copilot-vs-gemini': {
    slug: 'copilot-vs-gemini',
    namespace: 'compare-copilot-vs-gemini',
    toolA: 'Copilot',
    toolB: 'Gemini',
    canonicalPath: '/ai-tools/compare/copilot-vs-gemini',
    related: [],
  },
  'midjourney-vs-dalle': {
    slug: 'midjourney-vs-dalle',
    namespace: 'compare-midjourney-vs-dalle',
    toolA: 'Midjourney',
    toolB: 'DALL-E',
    canonicalPath: '/ai-tools/compare/midjourney-vs-dalle',
    related: [],
  },
};

export function getComparisonConfig(slug: string): ComparisonConfig | undefined {
  return COMPARISON_REGISTRY[slug];
}
