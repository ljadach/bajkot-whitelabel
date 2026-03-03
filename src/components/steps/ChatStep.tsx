import { useState, useEffect, useRef, useCallback, Component, ReactNode } from 'react';
import { useMutation, useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Doc } from '../../../convex/_generated/dataModel';
import { ChatMessage } from '@components/chat/ChatMessage';
import { ChatWidget } from '@components/chat/ChatWidget';
import { useAnalytics, generateProfileHash } from '@lib/telemetry';
import { ChatMessageRecord, sanitizeHistoryMessage } from '@components/chat/chatTypes';
import { useChatStream } from '@hooks/useChatStream';
import { ContinueBar } from './ContinueBar';
import { useAutoFillSafe } from '@components/debug/AutoFillContext';

// Error Boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ChatErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ChatStep] Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] px-4">
          <div className="text-center max-w-md">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-neutral-500 mb-4">We encountered an issue loading the chat. Please try refreshing the page.</p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ChatStepProps {
  profile: Doc<'userProfiles'>;
}

/** Maximum Q&A exchanges before frontend forces intake completion. Safety net for runaway loops.
 *  Keep in sync with MAX_INTAKE_QUESTIONS in convex/ai.ts and convex/streaming.ts. */
const MAX_INTAKE_QUESTIONS = 30;

function ChatStepInner({ profile }: ChatStepProps) {
  const { t } = useTranslation('chat');

  // === Local state ===
  const [composerValue, setComposerValue] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structured answer can be string | string[] | number
  const [structuredAnswer, setStructuredAnswer] = useState<any>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [localHistory, setLocalHistory] = useState<ChatMessageRecord[]>([]);
  const [localProfileXml, setLocalProfileXml] = useState<string>('');
  const [isIntakeComplete, setIsIntakeComplete] = useState(false);

  // === Refs ===
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);
  const operationLockRef = useRef(false); // Mutex to prevent concurrent submit/edit operations

  // === Hooks ===
  const updateProfile = useMutation(api.profiles.createOrUpdateProfile);
  const { track, getSessionId } = useAnalytics();
  const autoFill = useAutoFillSafe();
  const generateAutoFillResponse = useAction(api.autoFillChat.generateAutoFillResponse);

  // === Chat Stream Hook (simplified!) ===
  const { isLoading, streamingMessage, currentQuestion, error, streamNextQuestion, setQuestion, reset: resetStream } = useChatStream();

  // === Auto-fill refs ===
  const autoFillTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoFillingRef = useRef(false);

  // === Derived state ===
  const latestAnswerId = [...localHistory].reverse().find((msg) => msg.type === 'answer')?.id;

  // === Callbacks ===
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const resetComposer = useCallback(() => {
    setComposerValue('');
    setStructuredAnswer(null);
  }, []);

  // === Load next question and handle result ===
  const loadNextQuestion = useCallback(async () => {
    // Guard: force-end intake if too many questions (frontend safety net)
    const questionCount = (profile?.chatHistory as ChatMessageRecord[] | undefined)?.filter((m) => m.type === 'question').length ?? 0;
    if (questionCount >= MAX_INTAKE_QUESTIONS) {
      console.warn(`[ChatStep] Intake forced completion — ${questionCount} questions exceeded limit of ${MAX_INTAKE_QUESTIONS}`);
      resetComposer();
      setIsIntakeComplete(true);
      void updateProfile({ step: 'chat', intakeComplete: true });
      return;
    }

    const result = await streamNextQuestion();

    if (result) {
      // Update local profile XML
      if (result.profileXml) {
        setLocalProfileXml(result.profileXml);
        void updateProfile({ step: 'chat', profileXml: result.profileXml });
      }

      // Handle completion (intake finished)
      if (result.complete) {
        resetComposer();
        setIsIntakeComplete(true);

        // Add farewell message to history so it persists and shows on re-entry
        const farewellMessage = sanitizeHistoryMessage({
          id: `farewell-${Date.now()}`,
          type: 'question' as const,
          content: result.message,
          timestamp: Date.now(),
        });
        // Use functional update to get latest localHistory
        setLocalHistory((prev) => {
          const historyWithFarewell = [...prev, farewellMessage];
          // Persist completion flag and farewell message to DB
          void updateProfile({
            step: 'chat',
            chatHistory: historyWithFarewell,
            intakeComplete: true,
          });
          return historyWithFarewell;
        });
      } else {
        // Track widget render
        track('widget_rendered', {
          session_id: getSessionId(),
          step: 'chat',
          widget_type: result.widget?.type || 'free-text',
          profile_hash: generateProfileHash(result.profileXml || ''),
        });
      }
    }
  }, [streamNextQuestion, updateProfile, resetComposer, track, getSessionId, profile]);

  // === Track profile state to detect resets ===
  const prevHistoryLengthRef = useRef<number | null>(null);

  // === Initialize on profile change ===
  useEffect(() => {
    const currentHistoryLength = profile?.chatHistory?.length ?? 0;

    // Detect profile reset: had messages before, now empty
    if (prevHistoryLengthRef.current !== null && prevHistoryLengthRef.current > 0 && currentHistoryLength === 0) {
      hasInitializedRef.current = false;
    }
    prevHistoryLengthRef.current = currentHistoryLength;

    // Prevent double initialization (React StrictMode)
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    // Reset state from profile
    const history = profile?.chatHistory || [];
    const xml = typeof profile?.profileXml === 'string' ? profile.profileXml : '';

    setLocalHistory(history);
    setLocalProfileXml(xml);
    resetStream();
    resetComposer();

    // Track view
    track('chat_view_opened', {
      session_id: getSessionId(),
      step: 'chat',
      profile_hash: generateProfileHash(xml),
    });

    // If intake already complete (persisted in DB), restore state without LLM call
    // Farewell message is already in history, just set the flag
    if (profile?.intakeComplete) {
      setIsIntakeComplete(true);
      return;
    }

    // Otherwise, load next question from LLM
    setIsIntakeComplete(false);
    void loadNextQuestion();

    // Cleanup on unmount — DO NOT reset hasInitializedRef here.
    // React StrictMode runs mount→cleanup→mount; resetting the ref
    // causes a duplicate LLM call on the second mount.
    return () => {
      // intentionally empty — abort handled by useChatStream
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?._id, profile?.chatHistory?.length, profile?.intakeComplete]);

  // === Scroll on content change ===
  useEffect(() => {
    scrollToBottom();
  }, [localHistory, currentQuestion, streamingMessage, scrollToBottom]);

  // === Auto-fill effect ===
  useEffect(() => {
    // Clear any existing timeout
    if (autoFillTimeoutRef.current) {
      clearTimeout(autoFillTimeoutRef.current);
      autoFillTimeoutRef.current = null;
    }

    // Check if auto-fill should trigger
    const shouldAutoFill = autoFill?.enabled && currentQuestion && currentQuestion.question && !isLoading && !streamingMessage && !isSubmittingAnswer && !isAutoFillingRef.current && !isIntakeComplete;

    if (!shouldAutoFill) return;

    // Schedule auto-fill after 200ms of inactivity
    autoFillTimeoutRef.current = setTimeout(() => {
      if (isAutoFillingRef.current || !autoFill?.enabled) return;

      isAutoFillingRef.current = true;
      console.log('[ChatStep] Auto-fill: generating response for question:', currentQuestion?.question);

      // Build chat history for context
      const historyForContext = localHistory.map((msg) => ({
        type: msg.type,
        content: msg.content,
      }));

      // Generate response (fire and forget with proper error handling)
      generateAutoFillResponse({
        personaId: autoFill.personaId,
        customPersona: autoFill.personaId === 'custom' ? autoFill.customPersona : undefined,
        currentQuestion: currentQuestion?.question || '',
        widgetType: currentQuestion?.widgetType || 'free-text',
        options: currentQuestion?.options,
        chatHistory: historyForContext,
      })
        .then((result) => {
          console.log('[ChatStep] Auto-fill: got response:', result);

          // Set the response in composer
          setComposerValue(result.response);
          if (result.structured !== undefined) {
            setStructuredAnswer(result.structured);
          }
        })
        .catch((err) => {
          console.error('[ChatStep] Auto-fill error:', err);
        })
        .finally(() => {
          isAutoFillingRef.current = false;
        });
    }, 200);

    return () => {
      if (autoFillTimeoutRef.current) {
        clearTimeout(autoFillTimeoutRef.current);
        autoFillTimeoutRef.current = null;
      }
    };
  }, [autoFill?.enabled, autoFill?.personaId, autoFill?.customPersona, currentQuestion, isLoading, streamingMessage, isSubmittingAnswer, isIntakeComplete, localHistory, generateAutoFillResponse]);

  // === Auto-submit effect (triggered after auto-fill sets values) ===
  const pendingAutoSubmitRef = useRef(false);

  useEffect(() => {
    // When composerValue changes and auto-fill is active, auto-submit
    if (autoFill?.enabled && composerValue && !isLoading && !isSubmittingAnswer && currentQuestion && !pendingAutoSubmitRef.current) {
      pendingAutoSubmitRef.current = true;
      // Small delay to show the response before submitting
      const timer = setTimeout(() => {
        pendingAutoSubmitRef.current = false;
        // Trigger submit by clicking the submit button programmatically
        // or by calling handleSubmitAnswer directly
        const submitBtn = document.querySelector('[data-autofill-submit]') as HTMLButtonElement;
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.click();
        }
      }, 300);
      return () => {
        clearTimeout(timer);
        pendingAutoSubmitRef.current = false;
      };
    }
  }, [autoFill?.enabled, composerValue, isLoading, isSubmittingAnswer, currentQuestion]);

  // === Submit answer handler ===
  const handleSubmitAnswer = async () => {
    // Mutex: prevent concurrent operations (race condition fix)
    if (operationLockRef.current) {
      console.log('[ChatStep] Operation in progress, ignoring submit');
      return;
    }

    // Allow submission if there's a currentQuestion OR if intake is complete (continued chat)
    const canSubmit = currentQuestion || isIntakeComplete;
    if (!canSubmit) return;

    const trimmed = composerValue.trim();
    const payload = structuredAnswer !== null && structuredAnswer !== undefined ? structuredAnswer : trimmed;
    if (payload === null || payload === undefined || (typeof payload === 'string' && !payload.trim())) {
      return;
    }

    operationLockRef.current = true;
    setIsSubmittingAnswer(true);
    try {
      const answerTimestamp = Date.now();
      const questionTs = currentQuestion?.timestamp ?? Date.now();
      const timeToAnswer = answerTimestamp - questionTs;
      const widgetType = currentQuestion?.widgetType ?? 'free-text';

      const eventType = widgetType === 'free-text' ? 'free_text_entered' : 'option_selected';

      track(eventType, {
        session_id: getSessionId(),
        step: 'chat',
        widget_type: widgetType,
        time_to_answer_ms: timeToAnswer,
        profile_hash: generateProfileHash(localProfileXml),
      });

      const contentForDisplay = trimmed || (Array.isArray(payload) ? payload.join(', ') : typeof payload === 'number' ? payload.toString() : typeof payload === 'string' ? payload : JSON.stringify(payload));

      // Only add question to history if there was an actual question (not continued chat)
      const newHistory = [...localHistory];
      if (currentQuestion?.question) {
        const questionMessage = sanitizeHistoryMessage({
          id: `q-${Date.now()}`,
          type: 'question' as const,
          content: currentQuestion.question,
          widgetType: currentQuestion.widgetType,
          options: currentQuestion.options,
          timestamp: Date.now(),
        });
        newHistory.push(questionMessage);
      }

      const answerMessage = sanitizeHistoryMessage({
        id: `a-${Date.now()}`,
        type: 'answer' as const,
        content: contentForDisplay,
        answer: payload,
        timestamp: answerTimestamp,
      });
      newHistory.push(answerMessage);

      // Persist history FIRST - this is what the HTTP action will read
      await updateProfile({
        step: 'chat',
        chatHistory: newHistory,
        profileXml: localProfileXml || undefined,
      });

      setLocalHistory(newHistory);
      resetComposer();

      // Now stream next question (reads fresh history from DB)
      await loadNextQuestion();
    } finally {
      operationLockRef.current = false;
      setIsSubmittingAnswer(false);
    }
  };

  // === Edit message handler ===
  const handleEditMessage = async (messageId: string) => {
    // Mutex: prevent concurrent operations (race condition fix)
    if (operationLockRef.current) {
      console.log('[ChatStep] Operation in progress, ignoring edit');
      return;
    }
    const answerIndex = localHistory.findIndex((msg) => msg.id === messageId && msg.type === 'answer');
    if (answerIndex <= 0) return;

    operationLockRef.current = true;
    try {
      const answerMessage = localHistory[answerIndex];
      // Get the question that preceded this answer (should be at answerIndex - 1)
      const questionMessage = localHistory[answerIndex - 1];

      // Reset completion state
      setIsIntakeComplete(false);

      // Restore the answer in composer
      const restoredText = getAnswerText(answerMessage);
      setComposerValue(restoredText);

      if (Array.isArray(answerMessage?.answer) || typeof answerMessage?.answer === 'number') {
        setStructuredAnswer(answerMessage?.answer);
      } else if (typeof answerMessage?.answer === 'string') {
        setStructuredAnswer(answerMessage.answer);
      } else {
        setStructuredAnswer(null);
      }

      // Instead of calling LLM again, restore the original question from history
      // This ensures user is re-answering the SAME question, not a newly generated one
      if (questionMessage && questionMessage.type === 'question') {
        // Remove question AND answer from history (question will be re-added on submit)
        const historyWithoutQA = localHistory.slice(0, answerIndex - 1);
        await updateProfile({
          step: 'chat',
          chatHistory: historyWithoutQA,
          intakeComplete: false,
        });
        setLocalHistory(historyWithoutQA);

        // Manually set the original question (no LLM call needed)
        setQuestion({
          question: questionMessage.content,
          widgetType: (questionMessage.widgetType as 'single-select' | 'multi-select' | 'likert' | 'free-text') || 'free-text',
          options: questionMessage.options,
          timestamp: Date.now(),
        });
      } else {
        // Fallback: if no question found, call LLM (shouldn't happen normally)
        await loadNextQuestion();
      }
    } finally {
      operationLockRef.current = false;
    }
  };

  // === Render logic ===
  const showLoadingIndicator = isLoading && !streamingMessage;
  const isStreaming = !!streamingMessage;

  // Note: isIntakeComplete (set when LLM returns complete: true) determines when user can proceed

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto" data-testid="chat-messages">
        <div className="flex flex-col">
          {localHistory.map((message: ChatMessageRecord) => (
            <ChatMessage key={message.id} message={message} canEdit={message.id === latestAnswerId && !isLoading && !isSubmittingAnswer} onEdit={(id) => void handleEditMessage(id)} />
          ))}

          {/* Current question (from completed stream) */}
          {currentQuestion && !isStreaming && (
            <ChatMessage
              message={{
                id: 'current',
                type: 'question',
                content: currentQuestion.question,
                widgetType: currentQuestion.widgetType,
                options: currentQuestion.options,
                timestamp: currentQuestion.timestamp,
              }}
            />
          )}

          {/* Streaming message (shown while streaming) */}
          {isStreaming && (
            <ChatMessage
              message={{
                id: 'streaming',
                type: 'question',
                content: streamingMessage,
                timestamp: Date.now(),
              }}
              isStreaming={true}
            />
          )}

          {/* Loading indicator (before stream starts) */}
          {showLoadingIndicator && (
            <div data-testid="ai-thinking" className="py-5 bg-white">
              <div className="mx-auto flex max-w-3xl items-center gap-3 px-4">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-900">
                  <div className="w-3 h-3 spinner border-white/25 border-t-white" />
                </div>
                <span className="text-sm text-neutral-400">{t('thinking')}</span>
              </div>
            </div>
          )}

          {/* Note: Farewell message is now included in localHistory, no separate render needed */}

          {/* Error message with retry button */}
          {error && (
            <div className="py-5 bg-red-50">
              <div className="mx-auto max-w-3xl px-4">
                <div className="flex items-center gap-3 text-sm text-red-600 mb-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span>{t('connectionLost')}</span>
                </div>
                <button onClick={() => void loadNextQuestion()} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isLoading ? t('reconnecting') : t('reconnect')}
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat widget - hidden when intake is complete */}
      {!isIntakeComplete && (
        <ChatWidget
          question={currentQuestion}
          value={composerValue}
          onChange={(next, opts) => {
            setComposerValue(next);
            if (opts && Object.prototype.hasOwnProperty.call(opts, 'structured')) {
              setStructuredAnswer(opts.structured ?? null);
            } else {
              setStructuredAnswer(null);
            }
          }}
          onSubmit={() => void handleSubmitAnswer()}
          disabled={isLoading || !currentQuestion || isStreaming}
          isSubmitting={isSubmittingAnswer}
        />
      )}

      {/* Continue bar - shown when intake is complete (replaces chat input) */}
      {isIntakeComplete && <ContinueBar nextStep="verification" label="Skill Check" />}
    </div>
  );
}

// Export with error boundary wrapper
export function ChatStep({ profile }: ChatStepProps) {
  return (
    <ChatErrorBoundary>
      <ChatStepInner profile={profile} />
    </ChatErrorBoundary>
  );
}

function getAnswerText(message: ChatMessageRecord | undefined): string {
  if (!message) return '';
  if (typeof message.content === 'string' && message.content.length > 0) {
    return message.content;
  }
  if (Array.isArray(message.answer)) {
    return message.answer.join(', ');
  }
  if (typeof message.answer === 'number') {
    return message.answer.toString();
  }
  if (typeof message.answer === 'string') {
    return message.answer;
  }
  if (message.answer !== undefined) {
    try {
      return JSON.stringify(message.answer);
    } catch {
      return '';
    }
  }
  return '';
}
