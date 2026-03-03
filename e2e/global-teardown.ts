import { restoreProdLlmConfig } from './helpers/convex-env';

async function globalTeardown() {
  restoreProdLlmConfig();
}

export default globalTeardown;
