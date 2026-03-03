/**
 * useChatStream - Simple hook for streaming intake chat questions.
 *
 * Architecture:
 * - Profile in DB is source of truth
 * - This hook just streams LLM responses for UX
 * - Uses fetch + ReadableStream - no complex state management
 */

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { extractStreamingMessage, parseStreamedIntakeResponse } from '../../convex/lib/streamParser';

// Derive the Convex site URL from the cloud URL
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string;
const CONVEX_SITE_URL = CONVEX_URL?.replace('.cloud', '.site') || '';

const DEBUG = false;
const log = (...args: unknown[]) => DEBUG && console.log('[useChatStream]', ...args);

export interface Question {
  question: string;
  widgetType: 'single-select' | 'multi-select' | 'likert' | 'free-text';
  options?: string[];
  timestamp: number;
}

export interface StreamResult {
  message: string;
  widget: { type: string; options?: string[] };
  profileXml: string;
  complete: boolean;
}

export interface UseChatStreamResult {
  // State
  isLoading: boolean;
  streamingMessage: string;
  currentQuestion: Question | null;
  error: string | null;

  // Actions
  streamNextQuestion: () => Promise<StreamResult | null>;
  setQuestion: (question: Question | null) => void;
  reset: () => void;
}

export function useChatStream(): UseChatStreamResult {
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Abort controller for canceling ongoing streams
  const abortControllerRef = useRef<AbortController | null>(null);

  const { getToken } = useAuth();

  const streamNextQuestion = useCallback(async (): Promise<StreamResult | null> => {
    // Cancel any ongoing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    log('streamNextQuestion called');

    // Reset state
    setError(null);
    setStreamingMessage('');
    setCurrentQuestion(null);
    setIsLoading(true);

    try {
      // Get auth token
      const token = await getToken({ template: 'convex' });
      if (!token) {
        throw new Error('Brak tokenu uwierzytelniającego. Odśwież stronę i spróbuj ponownie.');
      }

      // Get current language from i18n (frontend source of truth for UI language)
      const currentLanguage = i18n.language?.split('-')[0] || 'en';
      log('Fetching stream...', { language: currentLanguage });

      // Make streaming request with language override
      const response = await fetch(`${CONVEX_SITE_URL}/stream-question`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: currentLanguage }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      log('Stream started, reading chunks...');

      // Read stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          log('Stream complete, total length:', fullText.length);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        // Update streaming message for UI
        const message = extractStreamingMessage(fullText);
        if (message) {
          setStreamingMessage(message);
        }
      }

      // Parse complete response
      const parsed = parseStreamedIntakeResponse(fullText);

      if (!parsed) {
        log('Failed to parse response');
        const message = extractStreamingMessage(fullText) || 'Could not parse response';
        setCurrentQuestion({
          question: message,
          widgetType: 'free-text',
          timestamp: Date.now(),
        });
        setStreamingMessage('');
        setIsLoading(false);
        return null;
      }

      log('Parsed response:', { message: parsed.message, complete: parsed.complete, hasWidget: !!parsed.widget?.type });

      // Determine if this is a question or a farewell message
      // Key insight: if complete=true, LLM says conversation is done - trust that and ignore widget
      // Only treat as question if complete=false AND there's a widget
      const isQuestion = !parsed.complete && parsed.widget?.type && parsed.message;

      if (isQuestion) {
        setCurrentQuestion({
          question: parsed.message,
          widgetType: parsed.widget?.type || 'free-text',
          options: parsed.widget?.options,
          timestamp: Date.now(),
        });
      } else {
        // Either complete=true (farewell) or no widget - no question to show
        setCurrentQuestion(null);
      }

      setStreamingMessage('');
      setIsLoading(false);

      return {
        message: parsed.message,
        widget: parsed.widget,
        profileXml: parsed.profileXml,
        complete: parsed.complete,
      };
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        log('Stream aborted');
        return null;
      }

      log('Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to stream question';
      setError(errorMessage);
      setIsLoading(false);
      return null;
    }
  }, [getToken, i18n.language]);

  const reset = useCallback(() => {
    log('reset called');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    setStreamingMessage('');
    setCurrentQuestion(null);
    setError(null);
  }, []);

  // Allow manually setting a question (used for edit mode)
  const setQuestion = useCallback((question: Question | null) => {
    log('setQuestion called', question);
    setCurrentQuestion(question);
  }, []);

  return {
    isLoading,
    streamingMessage,
    currentQuestion,
    error,
    streamNextQuestion,
    setQuestion,
    reset,
  };
}
