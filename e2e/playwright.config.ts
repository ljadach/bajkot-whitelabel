import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '..', '.env.test') });

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Sequential - shared auth state, one user
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0, // No retries locally for faster feedback
  workers: 1, // Single worker - CRITICAL: one user, no parallel execution
  reporter: [['html', { open: 'never' }], ['list']],

  // Run tests in alphabetical order by filename
  // 01-atomic-chat.spec.ts → 02-atomic-widgets.spec.ts → 99-happy-path.spec.ts
  testMatch: '**/*.spec.ts',
  testIgnore: ['**/00-login.spec.ts'],

  globalSetup: path.join(__dirname, 'global-setup.ts'),
  globalTeardown: path.join(__dirname, 'global-teardown.ts'),

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Auth state from global setup
    storageState: path.join(__dirname, '.auth/user.json'),
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  // Global timeouts for LLM operations
  timeout: 180_000, // 3 min per test
  expect: {
    timeout: 30_000,
  },
});
