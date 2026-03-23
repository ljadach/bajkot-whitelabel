import type { Config } from '@react-router/dev/config';
import { vercelPreset } from '@vercel/react-router/vite';

// Contact page excluded from prerender — ContactForm uses useAction (requires ConvexProvider)
const MARKETING_PATHS = ['/', '/support/faq'];

export default {
  appDirectory: 'src',
  ssr: true,
  presets: [vercelPreset()],
  async prerender() {
    return MARKETING_PATHS.map((path) => `/pl${path}`);
  },
} satisfies Config;
