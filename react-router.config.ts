import type { Config } from '@react-router/dev/config';
import { vercelPreset } from '@vercel/react-router/vite';

const LANGS = ['en', 'pl', 'de'];

const MARKETING_PATHS = [
  '/',
  '/pricing',
  '/ai-tools',
  '/ai-tools/glossary',
  '/ai-tools/compare',
  '/support/faq',
  '/about/contact',
  // Segment pages
  '/ai-for-business',
  '/ai-for-education',
  '/ai-for-executives',
  '/ai-for-individuals',
  '/ai-for-individuals/ai-for-freelancers',
  '/ai-for-individuals/ai-for-career-changers',
  '/ai-for-individuals/ai-for-creators',
  '/ai-for-individuals/ai-for-personal-productivity',
  // Product pages
  '/ai-tools/chatgpt',
  '/ai-tools/claude',
  '/ai-tools/gemini',
  '/ai-tools/grok',
  '/ai-tools/perplexity',
  '/ai-tools/copilot',
  '/ai-tools/notebooklm',
  '/ai-tools/dalle',
  '/ai-tools/midjourney',
  // Comparison pages
  '/ai-tools/compare/chatgpt-vs-claude',
  '/ai-tools/compare/chatgpt-vs-copilot',
  '/ai-tools/compare/chatgpt-vs-gemini',
  '/ai-tools/compare/claude-vs-gemini',
  '/ai-tools/compare/copilot-vs-gemini',
  '/ai-tools/compare/midjourney-vs-dalle',
];

export default {
  appDirectory: 'src',
  ssr: true,
  presets: [vercelPreset()],
  async prerender() {
    const routes: string[] = [];
    for (const lang of LANGS) {
      for (const path of MARKETING_PATHS) {
        routes.push(`/${lang}${path}`);
      }
    }
    return routes;
  },
} satisfies Config;
