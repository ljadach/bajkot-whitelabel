import type { Config } from '@react-router/dev/config';
import { vercelPreset } from '@vercel/react-router/vite';
import { TOPIC_SLUGS } from './src/data/topics';

// Contact page excluded from prerender — ContactForm uses useAction (requires ConvexProvider)
const MARKETING_PATHS = [
  '/',
  '/katalog',
  '/cennik',
  '/support/faq',
  '/regulamin',
  '/polityka-prywatnosci',
];
const TOPIC_PATHS = TOPIC_SLUGS.map((slug) => `/problem/${slug}`);

export default {
  appDirectory: 'src',
  ssr: true,
  presets: [vercelPreset()],
  async prerender() {
    return [...MARKETING_PATHS, ...TOPIC_PATHS];
  },
} satisfies Config;
