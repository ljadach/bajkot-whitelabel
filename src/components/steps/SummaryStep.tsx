import { useEffect, useState, useRef, useCallback } from 'react';
import { useAction, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Doc } from '../../../convex/_generated/dataModel';
import ReactMarkdown from 'react-markdown';
import { usePageView } from '@lib/telemetry';
import { proseComponents } from '@lib/markdownComponents';
import { ContinueBar } from './ContinueBar';
import { RegenerateBar } from './RegenerateBar';
import { LANGUAGES, type SupportedLanguage } from '@/locales';

interface SummaryStepProps {
  profile: Doc<'userProfiles'>;
}

type AssessmentActionRef = Parameters<typeof useAction>[0];
type ApiWithAssessment = typeof api & {
  ai: typeof api.ai & { generateAssessmentReport: AssessmentActionRef };
};

// Circular progress component for skill score
function SkillGauge({ score, level, label, isRawPercentage = false }: { score: number; level: string; label: string; isRawPercentage?: boolean }) {
  const percentage = isRawPercentage ? Math.round(score) : Math.round(score * 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on score
  const getColor = () => {
    if (percentage >= 80) return { stroke: '#16a34a', bg: '#f0fdf4', text: '#15803d' };
    if (percentage >= 60) return { stroke: '#f7931e', bg: '#fff7ed', text: '#c2410c' };
    if (percentage >= 40) return { stroke: '#ff6b35', bg: '#fff5f0', text: '#cc4a1a' };
    return { stroke: '#ef4444', bg: '#fef2f2', text: '#dc2626' };
  };

  const colors = getColor();

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e5e5" strokeWidth="8" />
          {/* Progress circle */}
          <circle cx="50" cy="50" r="45" fill="none" stroke={colors.stroke} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: 'stroke-dashoffset 0.5s ease-out' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-neutral-900">{percentage}</span>
        </div>
      </div>
      <div>
        <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mb-1" style={{ background: colors.bg, color: colors.text }}>
          {level}
        </div>
        <p className="text-xs text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

export function SummaryStep({ profile }: SummaryStepProps) {
  usePageView('summary');
  const { t, i18n } = useTranslation('summary');
  const [report, setReport] = useState<string>(profile?.assessmentReport || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasStartedRef = useRef(false);

  // Get full language name for LLM (e.g., 'en' -> 'English')
  const currentLangCode = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;
  const language = LANGUAGES[currentLangCode]?.name || 'English';

  const apiWithAssessment = api as ApiWithAssessment;
  const generate = useAction(apiWithAssessment.ai.generateAssessmentReport);
  const generateQuickTip = useAction(api.quickTipAi.generateQuickTip);
  const updateProfile = useMutation(api.profiles.createOrUpdateProfile);
  const clearQuickTip = useMutation(api.profiles.clearQuickTip);

  const profileData = parseProfileXml(profile?.profileXml);
  const verification = profile?.skillVerification;
  const hasReport = typeof report === 'string' && report.trim().length > 0;

  // Regenerate quick tip in background
  const regenerateQuickTip = useCallback(async () => {
    try {
      // Clear existing quick tip first
      await clearQuickTip({});

      // Build chat summary from recent messages
      const chatHistory = profile?.chatHistory || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chatHistory items have dynamic shape
      const chatSummary = chatHistory.map((m: any) => `${m.type}: ${m.content?.slice(0, 2000)}`).join('\n');

      await generateQuickTip({
        profileXml: profile?.profileXml || '',
        chatSummary,
        performanceScore: profile?.skillVerification?.performanceScore,
        fluencyScore: profile?.inferredAiFluency?.score,
        language,
      });
    } catch (error) {
      console.error('Error regenerating quick tip:', error);
    }
  }, [profile, generateQuickTip, clearQuickTip, language]);

  // Auto-generate assessment on mount (if not already generated)
  useEffect(() => {
    if (hasStartedRef.current) return;
    if (profile?.assessmentReport) {
      setReport(profile.assessmentReport);
      return;
    }

    hasStartedRef.current = true;
    void generateAssessment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?._id]);

  const generateAssessment = async (isRegeneration = false) => {
    setIsGenerating(true);
    setError(null);
    try {
      const md = await generate({
        chatHistory: profile?.chatHistory || [],
        profileXml: typeof profile?.profileXml === 'string' ? profile.profileXml : '',
        skillVerification: profile?.skillVerification,
        inferredAiFluency: profile?.inferredAiFluency ?? undefined,
        language,
      });
      setReport(md);
      try {
        await updateProfile({
          step: 'summary',
          assessmentReport: md,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- step-specific extra fields
        } as any);
      } catch (e) {
        console.warn('Failed to persist assessment report', e);
      }

      // Also regenerate quick tip in background when regenerating assessment
      if (isRegeneration) {
        void regenerateQuickTip();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    await generateAssessment(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto py-10 px-4 sm:px-6">
          {/* Page header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4" style={{ background: '#fff5f0', color: '#cc4a1a' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('badge')}
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 mb-2">{t('title')}</h1>
            <p className="text-neutral-500">{t('subtitle')}</p>
          </div>

          {/* Two column layout for profile */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Left column */}
            <div className="space-y-6">
              {/* Skill Assessment */}
              {(verification?.level || profile?.inferredAiFluency) && (
                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                  <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-4">{t('sections.skillAssessment')}</h3>
                  <div className="flex gap-6">
                    {verification?.level && (
                      <div className="flex-1">
                        <SkillGauge score={verification.performanceScore || 0} level={verification.level} label={t('sections.promptScore')} />
                        {verification.feedback && <p className="text-xs text-neutral-500 italic mt-3 pt-3 border-t border-neutral-100">"{verification.feedback}"</p>}
                      </div>
                    )}
                    {profile?.inferredAiFluency && (
                      <div className="flex-1">
                        <SkillGauge score={profile.inferredAiFluency.score} level={getFluencyLevel(profile.inferredAiFluency.score)} label={t('sections.aiFluency')} isRawPercentage />
                        {profile.inferredAiFluency.justification && <p className="text-xs text-neutral-500 mt-3 pt-3 border-t border-neutral-100">{profile.inferredAiFluency.justification}</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Role & Experience */}
              {profileData.role && (
                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                  <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-3">{t('sections.yourRole')}</h3>
                  <p className="text-lg text-neutral-800">{profileData.role}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profileData.seniority && <span className="text-sm text-neutral-500">{profileData.seniority}</span>}
                    {profileData.seniority && profileData.experience && <span className="text-neutral-300">|</span>}
                    {profileData.experience && (
                      <span className="text-sm text-neutral-500">
                        {profileData.experience} {t('sections.experience')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Tools */}
              {profileData.tools && profileData.tools.length > 0 && (
                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                  <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-3">{t('sections.aiTools')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {profileData.tools.map((tool, index) => (
                      <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: '#fff5f0', color: '#cc4a1a' }}>
                        {tool.name}
                        {tool.isPaid && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/50 text-neutral-600">{t('proBadge')}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Artifacts - What You Create */}
              {profileData.artifacts && profileData.artifacts.length > 0 && (
                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                  <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-3">{t('sections.whatYouCreate')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {profileData.artifacts.map((artifact, index) => (
                      <span key={index} className="px-3 py-1.5 rounded-lg text-sm bg-neutral-100 text-neutral-700">
                        {artifact}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Learning Goals */}
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-4">{t('sections.learningGoals')}</h3>
                {profileData.goals && profileData.goals.length > 0 ? (
                  <div className="space-y-3">
                    {profileData.goals.map((goal: string, index: number) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5" style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' }}>
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-sm text-neutral-700 leading-relaxed">{goal}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">{t('fallback.noGoals')}</p>
                )}
              </div>

              {/* Constraints - colorful */}
              {(profileData.timeCommitment || profileData.learningStyle || profileData.language) && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100 p-6">
                  <h3 className="text-sm font-semibold text-purple-900 uppercase tracking-wide mb-4">{t('sections.preferences')}</h3>
                  <div className="space-y-3">
                    {profileData.timeCommitment && (
                      <div className="flex items-center gap-3 bg-white/60 rounded-lg p-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-purple-600 font-medium">{t('preferences.timeAvailable')}</p>
                          <p className="text-sm text-neutral-800 font-medium">{profileData.timeCommitment}</p>
                        </div>
                      </div>
                    )}
                    {profileData.language && (
                      <div className="flex items-center gap-3 bg-white/60 rounded-lg p-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-indigo-600 font-medium">{t('preferences.language')}</p>
                          <p className="text-sm text-neutral-800 font-medium">{profileData.language}</p>
                        </div>
                      </div>
                    )}
                    {profileData.learningStyle && (
                      <div className="flex items-center gap-3 bg-white/60 rounded-lg p-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-violet-600 font-medium">{t('preferences.learningStyle')}</p>
                          <p className="text-sm text-neutral-800 font-medium">{profileData.learningStyle}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assessment Report Card */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="border-b border-neutral-100 p-6 bg-gradient-to-r from-neutral-50 to-white">
              <h2 className="text-xl font-semibold text-neutral-900">{t('report.title')}</h2>
              <p className="text-sm text-neutral-500 mt-1">{t('report.subtitle')}</p>
            </div>

            <div className="p-6">
              {isGenerating && (
                <div data-testid="assessment-loading" className="flex items-center justify-center py-16 text-neutral-500">
                  <div className="text-center">
                    <div className="w-10 h-10 spinner mx-auto mb-4" style={{ borderTopColor: '#ff6b35' }} />
                    <span className="text-sm">{t('report.generating')}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                  <button onClick={() => void generateAssessment()} className="ml-2 underline hover:no-underline">
                    {t('report.retry')}
                  </button>
                </div>
              )}

              {hasReport && !isGenerating && (
                <div data-testid="assessment-report" className="prose-enterprise max-w-none">
                  <ReactMarkdown components={proseComponents}>{report}</ReactMarkdown>
                </div>
              )}

              {!hasReport && !isGenerating && !error && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
                  <p className="text-sm text-neutral-500 mb-3">{t('report.empty')}</p>
                  <button onClick={() => void generateAssessment()} className="btn-primary">
                    {t('report.generateButton')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bars: RegenerateBar and ContinueBar when complete */}
      {hasReport && !isGenerating && (
        <>
          <RegenerateBar label={t('regenerateLabel')} onRegenerate={handleRegenerate} />
          <ContinueBar nextStep="plan" />
        </>
      )}
    </div>
  );
}

type ToolInfo = {
  name: string;
  usage?: string;
  isPaid?: boolean;
};

type ProfileState = {
  tools?: ToolInfo[];
  role?: string;
  seniority?: string;
  experience?: string;
  artifacts?: string[];
  goals?: string[];
  timeCommitment?: string;
  learningStyle?: string;
  language?: string;
};

function parseProfileXml(xml: unknown): ProfileState {
  if (typeof xml !== 'string' || !xml.trim()) return {};

  const state: ProfileState = {};

  // Parse tools with name attribute: <tool name="ChatGPT">...</tool>
  const toolMatches = xml.matchAll(/<tool\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/tool>/gi);
  const tools: ToolInfo[] = [];
  for (const match of toolMatches) {
    const name = match[1];
    const content = match[2] || '';
    const isPaidMatch = content.match(/<isToolPaid>(\w+)<\/isToolPaid>/i);
    const usageMatch = content.match(/<whatUserDoesInTool[^>]*>([^<]*)<\/whatUserDoesInTool>/i);
    tools.push({
      name,
      usage: usageMatch?.[1]?.trim() || undefined,
      isPaid: isPaidMatch?.[1]?.toLowerCase() === 'true',
    });
  }
  if (tools.length) state.tools = tools;

  // Simple text fields
  const role = extractFirst(xml, 'role');
  if (role) state.role = role;

  const seniority = extractFirst(xml, 'seniority');
  if (seniority) state.seniority = seniority;

  const experience = extractFirst(xml, 'experience');
  if (experience) state.experience = experience;

  // Artifacts
  const artifacts = extractMany(xml, 'artifact');
  if (artifacts.length) state.artifacts = artifacts;

  // Goals and needs combined
  const goals = extractMany(xml, 'goal');
  const needs = extractMany(xml, 'need');
  const allGoals = [...goals, ...needs];
  if (allGoals.length) state.goals = allGoals;

  // Time commitment - check both formats
  let timeCommitment = extractFirst(xml, 'timeCommitment');
  if (!timeCommitment) {
    // Try constraints attribute
    const constraintsMatch = xml.match(/<constraints[^>]*time_per_week="([^"]+)"[^>]*\/>/i);
    if (constraintsMatch) {
      timeCommitment = constraintsMatch[1] + ' hours/week';
    }
  }
  if (timeCommitment) state.timeCommitment = timeCommitment;

  const learningStyle = extractFirst(xml, 'learningStyle');
  if (learningStyle) state.learningStyle = learningStyle;

  // Language from constraints
  const languageMatch = xml.match(/<constraints[^>]*language="([^"]+)"[^>]*\/>/i);
  if (languageMatch) state.language = languageMatch[1];

  return state;
}

function extractFirst(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(re);
  if (!match) return undefined;
  const value = stripAllTags((match[1] ?? '').trim());
  return value || undefined;
}

function extractMany(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const out: string[] = [];
  for (const match of xml.matchAll(re)) {
    const value = stripAllTags((match[1] ?? '').trim());
    if (value) out.push(value);
  }
  return out;
}

function stripAllTags(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

function getFluencyLevel(score: number): string {
  if (score >= 80) return 'Advanced';
  if (score >= 60) return 'Proficient';
  if (score >= 40) return 'Developing';
  return 'Beginner';
}
