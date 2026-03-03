import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useAction } from 'convex/react';
import { Trans, useTranslation } from 'react-i18next';
import { LANGUAGES, type SupportedLanguage } from '@/locales';
import { api } from '../../../convex/_generated/api';
import { Doc } from '../../../convex/_generated/dataModel';
import { usePageView } from '@lib/telemetry';
import { ContinueBar } from './ContinueBar';
import { RegenerateBar } from './RegenerateBar';

interface VerificationStepProps {
  profile: Doc<'userProfiles'>;
}

export function VerificationStep({ profile }: VerificationStepProps) {
  usePageView('verification');
  const { t, i18n } = useTranslation('verification');
  const currentLangCode = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;
  const language = LANGUAGES[currentLangCode]?.name || 'English';
  const navigate = useNavigate();
  const [promptText, setPromptText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [inputType, setInputType] = useState<'prompt' | 'skill'>('prompt');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateVerification = useMutation(api.profiles.updateSkillVerification);
  const scorePrompt = useAction(api.ai.scorePrompt);
  const inferAiFluency = useAction(api.ai.inferAiFluency);

  // Initialize from profile if verification already exists
  useEffect(() => {
    if (profile?.skillVerification && !isRegenerating) {
      const sv = profile.skillVerification;
      setScore(sv.performanceScore ?? null);
      setFeedback(sv.feedback ?? null);
      setLevel(sv.level ?? null);
      if (sv.promptText) {
        setPromptText(sv.promptText);
      }
      if (sv.inputType === 'skill') {
        setInputType('skill');
      }
    }
  }, [profile?.skillVerification, isRegenerating]);

  // PRD: Rubric weights - goal:20, context&constraints:25, structure&roles:20, quality_criteria:20, iteration:15
  const handleSubmit = async () => {
    if (!promptText.trim()) return;

    setIsSubmitting(true);

    try {
      // Run both scorePrompt and inferAiFluency in parallel
      const [scoreResult, fluencyResult] = await Promise.all([
        scorePrompt({ promptText, inputType, language }),
        inferAiFluency({
          profileXml: profile.profileXml || '',
          chatHistory: profile.chatHistory || [],
          language,
        }),
      ]);

      // PRD: Level mapping
      const calculatedScore = scoreResult.score || 0;
      let calculatedLevel = 'Beginner';
      if (calculatedScore >= 0.8) calculatedLevel = 'Expert';
      else if (calculatedScore >= 0.6) calculatedLevel = 'Advanced';
      else if (calculatedScore >= 0.3) calculatedLevel = 'Intermediate';

      // Save both results to profile
      await updateVerification({
        performanceScore: calculatedScore,
        selfAssessment: 0, // Will be collected separately if needed
        promptText,
        level: calculatedLevel,
        feedback: scoreResult.feedback,
        inputType,
        inferredAiFluency: fluencyResult,
      });

      // Auto-navigate to summary (skip showing results in linear flow)
      void navigate('/summary');
    } catch (error) {
      console.error('Error scoring prompt:', error);
      setIsSubmitting(false);
      setIsRegenerating(false);
    }
  };

  const handleRegenerate = async () => {
    // Reset state to show the form again
    setScore(null);
    setFeedback(null);
    setLevel(null);
    setPromptText('');
    setIsRegenerating(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        setPromptText(content.slice(0, 15000));
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const isComplete = score !== null;

  // Dynamic content keys based on selected tab
  const contentKey = inputType;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-8 px-4">
          <div className="bg-white rounded-container border border-line p-8">
            {!isComplete ? (
              <div>
                {/* Tab toggle */}
                <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
                  <button onClick={() => setInputType('prompt')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${inputType === 'prompt' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
                    {t('tabs.prompt')}
                  </button>
                  <button onClick={() => setInputType('skill')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${inputType === 'skill' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
                    {t('tabs.skill')}
                  </button>
                </div>

                {/* PRD Spec: Best prompt task */}
                <div className="mb-6">
                  <label className="block text-lg font-medium text-ink mb-3">
                    <Trans i18nKey={`${contentKey}.label`} ns="verification" components={{ strong: <strong /> }} />
                  </label>
                  <p className="text-sm text-muted mb-4">{t(`${contentKey}.helper`)}</p>

                  {/* Why we ask tooltip */}
                  <div className="mb-4 p-4 bg-accent-subtle border border-accent/10 rounded-container">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-accent mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-accent mb-1">{t(`${contentKey}.whyWeAsk.title`)}</p>
                        <p className="text-sm text-ink">{t(`${contentKey}.whyWeAsk.description`)}</p>
                      </div>
                    </div>
                  </div>

                  <textarea
                    data-testid="prompt-input"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && promptText.trim() && !isSubmitting) {
                        e.preventDefault();
                        void handleSubmit();
                      }
                    }}
                    placeholder={t(`${contentKey}.placeholder`)}
                    className="w-full px-4 py-3 border border-line rounded-container focus:ring-2 focus:ring-accent focus:border-accent resize-none text-ink"
                    rows={8}
                    maxLength={15000}
                    autoCorrect="off"
                    autoCapitalize="off"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-muted">{t(`${contentKey}.charCount`, { count: promptText.length })}</span>
                    <div className="flex items-center gap-2">
                      <input ref={fileInputRef} type="file" accept=".md,.txt,.markdown" onChange={handleFileUpload} className="hidden" />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted hover:text-ink border border-line rounded-lg hover:bg-gray-50 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        {t(`${contentKey}.uploadFile`)}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="hidden sm:inline text-xs text-muted">{t(`${contentKey}.shortcut`)}</span>
                  <button
                    data-testid="submit-prompt"
                    onClick={() => void handleSubmit()}
                    disabled={!promptText.trim() || isSubmitting}
                    className="flex-1 sm:flex-none sm:ml-4 bg-accent text-white py-4 sm:px-8 rounded-container text-lg font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? t('submit.analyzing') : t('submit.button')}
                  </button>
                </div>
              </div>
            ) : (
              <div data-testid="score-display">
                {/* PRD Spec: Results with mini-feedback */}
                <div className="p-6 bg-green-50 border border-green-200 rounded-container">
                  <div className="flex items-center mb-3">
                    <svg className="w-6 h-6 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xl font-bold text-green-800">{t('result.title')}</span>
                  </div>
                  <p className="text-lg text-green-700 mb-2" data-testid="level-display">
                    {t('result.levelLabel')} <strong>{level}</strong>
                  </p>
                  {/* PRD Spec: Mini-feedback (1 sentence) */}
                  {feedback && (
                    <p className="text-md text-green-800 italic" data-testid="feedback-display">
                      "{feedback}"
                    </p>
                  )}
                </div>

                <p className="text-muted mt-6 text-center">{t('result.context')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar: ContinueBar when complete, RegenerateBar option */}
      {isComplete && (
        <>
          <RegenerateBar label={t('regenerateLabel')} onRegenerate={handleRegenerate} />
          <ContinueBar nextStep="summary" />
        </>
      )}
    </div>
  );
}
