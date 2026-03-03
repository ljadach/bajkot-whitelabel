const baseUrl = process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';
const secretKey = process.env.LANGFUSE_SECRET_KEY;
const publicKey = process.env.LANGFUSE_PUBLIC_KEY;

const hasPromptCredentials = Boolean(secretKey) && Boolean(publicKey);

const promptClientPromise: Promise<any> | null = hasPromptCredentials
  ? import('@langfuse/client')
      .then((mod: any) => {
        return new mod.LangfuseClient({
          secretKey,
          publicKey,
          baseUrl,
        });
      })
      .catch((error: unknown) => {
        console.warn('[langfuse-prompts] failed to load Langfuse client', error);
        return null;
      })
  : null;

type PromptOptions = {
  label?: string;
  version?: number;
  type?: 'text' | 'chat';
  variables?: Record<string, string>;
};

export async function fetchPrompt(name: string, options: PromptOptions = {}) {
  if (!promptClientPromise) {
    console.warn('[langfuse-prompts] missing credentials; skip fetch', {
      name,
    });
    return null;
  }
  const client = await promptClientPromise;
  if (!client) return null;

  const prompt = await client.prompt.get(name, {
    label: options.label,
    version: options.version,
    type: options.type,
  });

  const compiled = options.variables ? prompt.compile?.(options.variables) : null;

  return {
    type: options.type || ('type' in prompt ? prompt.type : 'text'),
    prompt: prompt.prompt,
    config: prompt.config ?? null,
    compiled,
  };
}
