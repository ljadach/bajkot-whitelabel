import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONVEX_BIN = path.resolve(__dirname, '../../node_modules/.bin/convex');

function runConvex(args: string): string {
  return execSync(`node ${CONVEX_BIN} ${args}`, {
    cwd: path.resolve(__dirname, '../..'),
    encoding: 'utf-8',
    timeout: 15_000,
  }).trim();
}

/**
 * Set LLM_CONFIG_PROFILE=test on the Convex dev deployment.
 * This switches all pipeline stages to google/gemini-2.5-flash (cheapest/fastest).
 */
export function setTestLlmConfig(): void {
  console.log('[convex-env] Setting LLM_CONFIG_PROFILE=test');
  runConvex('env set LLM_CONFIG_PROFILE test');
}

/**
 * Remove LLM_CONFIG_PROFILE from the Convex dev deployment,
 * restoring the default prod config.
 */
export function restoreProdLlmConfig(): void {
  console.log('[convex-env] Removing LLM_CONFIG_PROFILE (restoring prod default)');
  try {
    runConvex('env remove LLM_CONFIG_PROFILE');
  } catch {
    // Already unset — ignore
  }
}
