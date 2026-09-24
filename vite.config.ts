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
});
