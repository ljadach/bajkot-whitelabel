import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import Sonda from 'sonda/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [reactRouter(), ...(process.env.SONDA ? [Sonda()] : [])],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
    },
  },
  server: {
    // Dev mirror of the vercel.json PostHog reverse proxy (/ingest/*) so the
    // SDK behaves the same locally as in production.
    proxy: {
      '/ingest/static': {
        target: 'https://eu-assets.i.posthog.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ingest/, ''),
      },
      '/ingest': {
        target: 'https://eu.i.posthog.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ingest/, ''),
      },
    },
  },
  ssr: {
    // Bundle these into SSR so their built-in browser detection works (no-op on server).
    // Without this, Vite uses require() at runtime which crashes on Vercel serverless.
    // See: https://posthog.com/docs/libraries/react-router/react-router-v7-framework-mode
    noExternal: ['posthog-js', '@posthog/react'],
  },
});
