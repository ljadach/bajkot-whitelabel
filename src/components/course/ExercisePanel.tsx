import { useState } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import ReactMarkdown from 'react-markdown';

interface ExercisePanelProps {
  courseDocumentId: Id<'courseDocuments'>;
  chapterNumber: number;
}

// Labels are now retrieved via translations

const EXERCISE_TYPE_ICONS = {
  prompt_improvement: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  ),
  problem_solving: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
      />
    </svg>
  ),
  reflection: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
      />
    </svg>
  ),
};

export function ExercisePanel({ courseDocumentId, chapterNumber }: ExercisePanelProps) {
  const { t } = useTranslation('course');
  const [answer, setAnswer] = useState('');
  const [showHints, setShowHints] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch exercise for this chapter
  const exercise = useQuery(api.exercises.getExerciseForChapter, {
    courseDocumentId,
    chapterNumber,
  });

  // Fetch user's existing submission
  const submission = useQuery(api.exercises.getUserSubmission, exercise ? { exerciseId: exercise._id } : 'skip');

  // Submit exercise mutation
  const submitExercise = useMutation(api.exercises.submitExercise);

  // Evaluate exercise action
  const evaluateExercise = useAction(api.exerciseAi.evaluateExercise);

  // Generate exercise action
  const generateExercise = useAction(api.exerciseAi.generateExerciseManually);

  // Handle form submission
  const handleSubmit = async () => {
    if (!exercise || !answer.trim()) return;

    setIsSubmitting(true);
    try {
      const submissionId = await submitExercise({
        exerciseId: exercise._id,
        submissionText: answer.trim(),
      });

      setIsSubmitting(false);
      setIsEvaluating(true);

      // Evaluate with AI
      await evaluateExercise({ submissionId });
      setIsEvaluating(false);
    } catch (error) {
      console.error('Error submitting exercise:', error);
      setIsSubmitting(false);
      setIsEvaluating(false);
    }
  };

  // Handle hint reveal
  const revealHint = (index: number) => {
    if (!showHints.includes(index)) {
      setShowHints([...showHints, index]);
    }
  };

  // Loading state
  if (exercise === undefined) {
    return (
      <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 spinner" />
          <span className="text-sm text-neutral-500">{t('exercise.loading')}</span>
        </div>
      </div>
    );
  }

  // Handle generate exercise
  const handleGenerateExercise = async () => {
    setIsGenerating(true);
    try {
      await generateExercise({ courseDocumentId, chapterNumber });
      // Exercise will appear via reactive query - don't reset isGenerating here
      // because the action returns immediately (it schedules the actual generation)
    } catch (error) {
      console.error('Error generating exercise:', error);
      setIsGenerating(false); // Only reset on error
    }
  };

  // No exercise available - show generate button
  if (exercise === null) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-neutral-700 mb-1">{t('exercise.empty.title')}</h3>
          <p className="text-xs text-neutral-500 mb-4 max-w-xs">{t('exercise.empty.description')}</p>
          <button onClick={() => void handleGenerateExercise()} disabled={isGenerating} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isGenerating ? (
              <>
                <div className="h-4 w-4 spinner border-white/30 border-t-white" />
                {t('exercise.generating')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                {t('exercise.generateButton')}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Has completed submission
  if (submission && submission.score > 0) {
    return (
      <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-green-900">{t('exercise.completed.title')}</h3>
            <p className="text-sm text-green-700">{t('exercise.completed.score', { score: submission.score, points: submission.pointsAwarded })}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-green-200 p-4">
          <h4 className="text-sm font-medium text-neutral-700 mb-2">{t('exercise.yourAnswer')}</h4>
          <p className="text-sm text-neutral-600 whitespace-pre-wrap mb-4">{submission.submissionText}</p>

          <h4 className="text-sm font-medium text-neutral-700 mb-2">{t('exercise.feedback')}</h4>
          <div className="prose-sm prose-neutral">
            <ReactMarkdown>{submission.feedback}</ReactMarkdown>
          </div>
        </div>

        <button onClick={() => setAnswer(submission.submissionText)} className="mt-4 text-sm text-green-700 hover:text-green-800 font-medium">
          {t('exercise.tryAgain')}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">{EXERCISE_TYPE_ICONS[exercise.exerciseType]}</div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-neutral-900">{t('exercise.chapterTitle', { number: chapterNumber })}</h3>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">{exercise.maxPoints} pts</span>
          </div>
          <p className="text-sm text-neutral-500">{t(`exercise.types.${exercise.exerciseType}`)}</p>
        </div>
      </div>

      {/* Exercise prompt */}
      <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
        <p className="text-[15px] text-neutral-800 leading-relaxed">{exercise.prompt}</p>
      </div>

      {/* Hints section */}
      {exercise.hints && exercise.hints.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-sm font-medium text-neutral-700">{t('exercise.hints.label')}</span>
          </div>
          <div className="flex gap-2">
            {exercise.hints.map((_, index) => (
              <button
                key={index}
                onClick={() => revealHint(index)}
                disabled={showHints.includes(index)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${showHints.includes(index) ? 'bg-amber-100 text-amber-700 cursor-default' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
              >
                {t('exercise.hints.button', { number: index + 1 })}
              </button>
            ))}
          </div>
          {showHints.length > 0 && (
            <div className="mt-3 space-y-2">
              {showHints.sort().map((index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-xs font-medium text-amber-600 mt-0.5">{t('exercise.hints.prefix', { number: index + 1 })}</span>
                  <p className="text-sm text-amber-800">{exercise.hints![index]}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Answer textarea */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-neutral-700 mb-2">{t('exercise.input.label')}</label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={t('exercise.input.placeholder')}
          rows={6}
          disabled={isSubmitting || isEvaluating}
          className="w-full px-4 py-3 border border-neutral-300 rounded-lg text-[15px] focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-neutral-100 disabled:cursor-not-allowed resize-none"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && answer.trim() && !isSubmitting && !isEvaluating) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
        />
      </div>

      {/* Submit button */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">{answer.length > 0 && t('exercise.input.charCount', { count: answer.length })}</span>
        <button
          onClick={() => void handleSubmit()}
          disabled={!answer.trim() || isSubmitting || isEvaluating}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting || isEvaluating ? (
            <>
              <div className="h-4 w-4 spinner border-white/30 border-t-white" />
              {isEvaluating ? t('exercise.submit.evaluating') : t('exercise.submit.submitting')}
            </>
          ) : (
            <>
              {t('exercise.submit.button')}
              <span className="text-xs opacity-70">{t('exercise.submit.shortcut')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
