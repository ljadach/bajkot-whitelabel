import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
    },
  },
  ssr: {
    // Bundle these into SSR so their built-in browser detection works (no-op on server).
    // Without this, Vite uses require() at runtime which crashes on Vercel serverless.
    // See: https://posthog.com/docs/libraries/react-router/react-router-v7-framework-mode
    noExternal: ['posthog-js', '@posthog/react'],
  },
});
