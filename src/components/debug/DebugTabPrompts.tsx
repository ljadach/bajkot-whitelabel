import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import ReactMarkdown from 'react-markdown';

type PromptInfo = {
  template: string;
  langfuseName: string;
  type: string;
  hasLangfuseVersion: boolean;
  langfuseContent?: string;
  fallbackPreview: string;
};

export function DebugTabPrompts() {
  const [useLangfuse, setUseLangfuse] = useState<boolean | null>(null);
  const [prompts, setPrompts] = useState<PromptInfo[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  const debugListPrompts = useAction(api.ai.debugListPrompts);

  const handleLoad = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await debugListPrompts({});
      setUseLangfuse(result.useLangfusePrompts);
      setPrompts(result.prompts);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      {/* Header with load button */}
      <div className="rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Prompt Source</div>
          <button onClick={() => void handleLoad()} disabled={isLoading} className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:border-gray-500 hover:bg-gray-50 disabled:opacity-50">
            {isLoading ? 'Loading...' : prompts ? 'Refresh' : 'Load Prompts'}
          </button>
        </div>
        <p className="text-xs text-gray-500">Click to fetch all configured prompts and check source status.</p>
      </div>

      {/* Langfuse flag status */}
      {useLangfuse !== null && (
        <div className={`rounded-lg border p-3 ${useLangfuse ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-center gap-2">
            <span className={`inline-flex h-2 w-2 rounded-full ${useLangfuse ? 'bg-green-500' : 'bg-amber-500'}`} />
            <span className={`text-sm font-medium ${useLangfuse ? 'text-green-800' : 'text-amber-800'}`}>USE_LANGFUSE_PROMPTS = {useLangfuse ? 'true' : 'false'}</span>
          </div>
          <p className={`mt-1 text-xs ${useLangfuse ? 'text-green-600' : 'text-amber-600'}`}>{useLangfuse ? 'Prompts are fetched from Langfuse first, falling back to inline code.' : 'All prompts are served from inline code fallbacks. Langfuse is bypassed.'}</p>
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      {prompts && (
        <div className="space-y-2">
          {prompts.map((prompt) => (
            <div key={prompt.template} className="rounded-lg border border-gray-200 overflow-hidden">
              <button onClick={() => setExpandedPrompt(expandedPrompt === prompt.template ? null : prompt.template)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 text-left">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${prompt.hasLangfuseVersion ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{prompt.hasLangfuseVersion ? 'Langfuse' : 'Fallback'}</span>
                  <span className="font-medium text-gray-900">{prompt.template}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{prompt.langfuseName}</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedPrompt === prompt.template ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedPrompt === prompt.template && (
                <div className="border-t border-gray-100 p-3 bg-gray-50">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        Type: <span className="text-gray-700">{prompt.type}</span>
                      </div>
                    </div>

                    {prompt.hasLangfuseVersion && prompt.langfuseContent && (
                      <div>
                        <div className="text-xs font-medium text-green-600 mb-1">Langfuse Content:</div>
                        <div className="prose prose-xs max-w-none max-h-60 overflow-auto rounded bg-white border border-gray-200 p-2 text-xs text-gray-800 [&_pre]:bg-gray-50 [&_pre]:text-[11px] [&_pre]:p-2 [&_pre]:rounded [&_pre]:border [&_pre]:border-gray-200 [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-xs [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
                          <ReactMarkdown>{prompt.langfuseContent}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-xs font-medium text-amber-600 mb-1">Fallback Preview:</div>
                      <div className="prose prose-xs max-w-none max-h-40 overflow-auto rounded bg-white border border-gray-200 p-2 text-xs text-gray-800 [&_pre]:bg-gray-50 [&_pre]:text-[11px] [&_pre]:p-2 [&_pre]:rounded [&_pre]:border [&_pre]:border-gray-200 [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-xs [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
                        <ReactMarkdown>{prompt.fallbackPreview}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {prompts && (
        <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
          <div className="text-xs text-gray-600">
            <span className="font-medium">{prompts.length}</span> prompts configured.{' '}
            {useLangfuse ? (
              <>
                <span className="font-medium text-green-600">{prompts.filter((p) => p.hasLangfuseVersion).length}</span> from Langfuse, <span className="font-medium text-amber-600">{prompts.filter((p) => !p.hasLangfuseVersion).length}</span> using fallback.
              </>
            ) : (
              <span className="font-medium text-amber-600">All using inline fallbacks (Langfuse disabled).</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
