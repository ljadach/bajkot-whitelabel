export interface ProductConfig {
  slug: string;
  namespace: string;
  toolName: string;
  canonicalPath: string;
  category: 'text' | 'image' | 'productivity' | 'research';
}

export const PRODUCT_REGISTRY: Record<string, ProductConfig> = {
  chatgpt: {
    slug: 'chatgpt',
    namespace: 'product-chatgpt',
    toolName: 'ChatGPT',
    canonicalPath: '/ai-tools/chatgpt',
    category: 'text',
  },
  claude: {
    slug: 'claude',
    namespace: 'product-claude',
    toolName: 'Claude',
    canonicalPath: '/ai-tools/claude',
    category: 'text',
  },
  gemini: {
    slug: 'gemini',
    namespace: 'product-gemini',
    toolName: 'Gemini',
    canonicalPath: '/ai-tools/gemini',
    category: 'text',
  },
  copilot: {
    slug: 'copilot',
    namespace: 'product-copilot',
    toolName: 'Microsoft Copilot',
    canonicalPath: '/ai-tools/copilot',
    category: 'productivity',
  },
  midjourney: {
    slug: 'midjourney',
    namespace: 'product-midjourney',
    toolName: 'Midjourney',
    canonicalPath: '/ai-tools/midjourney',
    category: 'image',
  },
  dalle: {
    slug: 'dalle',
    namespace: 'product-dalle',
    toolName: 'DALL-E',
    canonicalPath: '/ai-tools/dalle',
    category: 'image',
  },
  grok: {
    slug: 'grok',
    namespace: 'product-grok',
    toolName: 'Grok',
    canonicalPath: '/ai-tools/grok',
    category: 'text',
  },
  notebooklm: {
    slug: 'notebooklm',
    namespace: 'product-notebooklm',
    toolName: 'NotebookLM',
    canonicalPath: '/ai-tools/notebooklm',
    category: 'productivity',
  },
  perplexity: {
    slug: 'perplexity',
    namespace: 'product-perplexity',
    toolName: 'Perplexity',
    canonicalPath: '/ai-tools/perplexity',
    category: 'research',
  },
};

export function getProductConfig(slug: string): ProductConfig | undefined {
  return PRODUCT_REGISTRY[slug];
}
