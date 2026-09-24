import type { Config } from '@react-router/dev/config';
import { vercelPreset } from '@vercel/react-router/vite';

// SSR (not prerendered): the partner theme comes from the URL, so every page
// is rendered on request in that partner's colours.
export default {
  appDirectory: 'src',
  ssr: true,
  presets: [vercelPreset()],
} satisfies Config;
