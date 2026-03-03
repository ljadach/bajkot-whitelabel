import { useEffect, useState } from 'react';
import { useAction, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { renderMarkdown } from '@lib/utils';
import { usePageView } from '@lib/telemetry';
import { Spinner } from '../common/Spinner';
import { LANGUAGES, type SupportedLanguage } from '@/locales';

interface AssessmentStepProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- profile shape varies across steps
  profile: any;
}

type AssessmentActionRef = Parameters<typeof useAction>[0];
type ApiWithAssessment = typeof api & {
  ai: typeof api.ai & { generateAssessmentReport: AssessmentActionRef };
};

export function AssessmentStep({ profile }: AssessmentStepProps) {
  usePageView('assessment');
  const { i18n } = useTranslation();
  const [report, setReport] = useState<string>(profile?.assessmentReport || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get full language name for LLM (e.g., 'en' -> 'English')
  const currentLangCode = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;
  const language = LANGUAGES[currentLangCode]?.name || 'English';

  const apiWithAssessment = api as ApiWithAssessment;
  const generate = useAction(apiWithAssessment.ai.generateAssessmentReport);
  const updateProfile = useMutation(api.profiles.createOrUpdateProfile);

  useEffect(() => {
    setReport(profile?.assessmentReport || '');
  }, [profile?._id, profile?.assessmentReport]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const md = await generate({
        chatHistory: profile?.chatHistory || [],
        profileXml: typeof profile?.profileXml === 'string' ? profile.profileXml : '',
        skillVerification: profile?.skillVerification,
        language,
      });
      setReport(md);
      try {
        await updateProfile({
          step: 'assessment',
          assessmentReport: md,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- step-specific extra fields
        } as any);
      } catch (e) {
        console.warn('Failed to persist assessment report', e);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinue = async () => {
    try {
      await updateProfile({ step: 'plan' });
    } catch (e) {
      console.error('Error continuing to plan:', e);
    }
  };

  const hasReport = typeof report === 'string' && report.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-4xl py-8">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Your Assessment</h2>
          <p className="mt-1 text-sm text-gray-600">A concise, well-formatted summary of your profile to guide upskilling.</p>
        </div>
        <div className="p-6">
          {!hasReport && !isGenerating && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <p className="mb-3 text-gray-700">Generate your assessment based on your profile and chat history.</p>
              <button onClick={() => void handleGenerate()} className="rounded-full bg-gray-900 px-6 py-2 text-sm font-semibold text-white hover:bg-black">
                Generate Assessment
              </button>
            </div>
          )}

          {isGenerating && (
            <div className="flex items-center justify-center py-10 text-gray-600">
              <Spinner size="sm" variant="dark" className="mr-3" />
              Generating assessment...
            </div>
          )}

          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

          {hasReport && !isGenerating && (
            <article className="prose prose-sm max-w-none">
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }} />
            </article>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 p-6">
          <button onClick={() => void handleGenerate()} disabled={isGenerating} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
            {hasReport ? 'Regenerate' : 'Generate'}
          </button>
          <button onClick={() => void handleContinue()} className="rounded-full bg-gray-900 px-6 py-2 text-sm font-semibold text-white hover:bg-black">
            Continue to Training Plan
          </button>
        </div>
      </div>
    </div>
  );
}
