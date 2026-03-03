/**
 * Simple streaming for intake chat.
 *
 * Architecture:
 * - Profile (chatHistory, profileXml) is source of truth in DB
 * - HTTP action reads current profile, streams LLM response directly to browser
 * - No stream IDs, no persistence layer - just direct streaming
 * - Logs to llmLogs table and Langfuse for observability
 */

import { httpAction } from './_generated/server';
import { api, internal } from './_generated/api';
import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { renderPrompt, PromptTemplate } from './lib/prompts';
import { getStageConfig } from './lib/pipelineConfig';
import { defaultProfileXml } from './lib/profileXml';
import { startActiveObservation } from './lib/langfuse';
import { createLogger } from './lib/logger';
import { getLanguageFromProfile } from './lib/language';
import type { ChatMessage } from './lib/chatMessage';

/** Maximum Q&A exchanges before forcing intake completion. Prevents runaway LLM loops. */
const MAX_INTAKE_QUESTIONS = 30;

function getAllowedOrigins(): Set<string> {
  const origins = ['http://localhost:5173'];
  const env = process.env.ALLOWED_ORIGIN;
  if (env) {
    origins.push(env);
    // auto-add www variant (or non-www if www was provided)
    if (env.includes('://www.')) {
      origins.push(env.replace('://www.', '://'));
    } else {
      origins.push(env.replace('://', '://www.'));
    }
  }
  return new Set(origins);
}

function getCorsHeaders(request?: Request): Record<string, string> {
  const allowed = getAllowedOrigins();
  const requestOrigin = request?.headers.get('Origin') ?? '';
  const origin = allowed.has(requestOrigin) ? requestOrigin : (process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173');
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * HTTP Action: Stream the next intake question.
 * Reads current profile from DB and streams LLM response directly to browser.
 * Accepts optional language override in request body (for when profile isn't synced yet).
 */
export const streamQuestion = httpAction(async (ctx, request) => {
  const log = createLogger(ctx, 'streamQuestion');
  log.info('Request received');

  // Parse request body for language override
  let bodyLanguage: string | undefined;
  try {
    const body = await request.json();
    bodyLanguage = body?.language;
  } catch {
    // No body or invalid JSON - that's fine, will fall back to profile
  }

  // Auth check
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    log.error('No identity');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' } });
  }

  // Get current profile
  const profile = await ctx.runQuery(api.profiles.getCurrentProfile, {});
  if (!profile) {
    log.error('No profile for user', { userId: identity.subject });
    return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' } });
  }

  const chatHistory = (profile.chatHistory as ChatMessage[]) || [];
  const profileXml = typeof profile.profileXml === 'string' ? profile.profileXml : defaultProfileXml();

  // Language priority: request body (frontend i18n) > profile > default
  const profileLanguage = getLanguageFromProfile(profile);
  const language = bodyLanguage || profileLanguage;

  log.info('Profile loaded', {
    clerkUserId: identity.subject,
    historyLength: chatHistory.length,
    language,
    languageSource: bodyLanguage ? 'request' : 'profile',
  });

  // Check API key
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterApiKey) {
    log.error('No OPENROUTER_API_KEY');
    return new Response(JSON.stringify({ error: 'Configuration error' }), { status: 500, headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' } });
  }

  // Prepare LLM call
  const openrouter = createOpenRouter({ apiKey: openrouterApiKey });
  const streamConfig = getStageConfig('intake_stream');
  const llmModel = streamConfig.model;
  const questionNumber = chatHistory.filter((m) => m.type === 'question').length + 1;
  const isFirstMessage = chatHistory.length === 0;

  // Render prompts
  const xmlDefinition = await renderPrompt(PromptTemplate.ProfileXmlDefinition);
  const systemPrompt = await renderPrompt(PromptTemplate.IntakeXmlStreamingSystem, {
    XML_DEFINITION: xmlDefinition,
    LANGUAGE: language,
  });
  const userPrompt = await renderPrompt(PromptTemplate.IntakeXmlUser, {
    CHAT_HISTORY_JSON: JSON.stringify(chatHistory),
    PROFILE_JSON: profileXml,
    QUESTION_NUMBER: questionNumber.toString(),
  });

  // Guard: force-end intake if too many questions (prevents runaway LLM cost)
  if (questionNumber > MAX_INTAKE_QUESTIONS) {
    log.warn('Intake forced completion — max questions exceeded', {
      questionNumber,
      maxAllowed: MAX_INTAKE_QUESTIONS,
      clerkUserId: identity.subject,
      historyLength: chatHistory.length,
    });

    const forceCompleteMessage = language.startsWith('pl') ? 'Dziękuję za odpowiedzi! Mam wystarczająco dużo informacji, aby przygotować Twój profil. Przejdźmy dalej! ✅' : 'Thank you for your answers! I have enough information to prepare your profile. Let\u2019s move on! ✅';
    const forceJson = JSON.stringify({
      widget: { type: 'free-text' },
      profileXml,
      complete: true,
    });
    const forceResponse = `${forceCompleteMessage}\n<<<JSON_RESPONSE>>>\n${forceJson}`;

    return new Response(forceResponse, {
      headers: { ...getCorsHeaders(request), 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  log.info('Calling LLM', { model: llmModel, questionNumber, isFirstMessage, language });

  const clerkUserId = identity.subject;
  const startTime = Date.now();

  // Helper to store LLM log (fire-and-forget, errors are logged but not thrown)
  const storeLlmLog = async (response?: string, error?: string) => {
    try {
      await ctx.runMutation(internal.llmLogs.storeLlmLog, {
        clerkUserId,
        action: 'streamIntakeQuestion',
        model: llmModel,
        systemPrompt,
        userPrompt,
        response,
        error,
        durationMs: Date.now() - startTime,
      });
    } catch (e) {
      log.warn('Failed to store LLM log', { error: String(e) });
    }
  };

  try {
    const result = await streamText({
      model: openrouter(llmModel),
      temperature: streamConfig.temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    // Create a TransformStream to process chunks
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Stream in background (don't await - let it run while we return the response)
    // Collect full response for logging
    // IMPORTANT: Store log BEFORE writer.close() - Convex terminates after close()
    void (async () => {
      let fullResponse = '';
      try {
        await startActiveObservation(
          'http.streamIntakeQuestion',
          async (span) => {
            span.update({
              action: 'streamIntakeQuestion',
              model: llmModel,
              questionNumber,
              isFirstMessage,
              historyLength: chatHistory.length,
              system_length: systemPrompt.length,
              user_length: userPrompt.length,
            });

            for await (const chunk of result.textStream) {
              fullResponse += chunk;
              await writer.write(encoder.encode(chunk));
            }

            span.update({
              output_length: fullResponse.length,
              output_preview: fullResponse.slice(0, 500),
            });
          },
          { asType: 'generation' }
        );

        log.info('Stream completed successfully');

        // Store log BEFORE closing writer - Convex terminates HTTP action after close()
        await storeLlmLog(fullResponse);
        await writer.close();
      } catch (error) {
        log.error('Stream error', { error: error instanceof Error ? error.message : String(error) });

        // Store error log BEFORE aborting
        await storeLlmLog(fullResponse || undefined, error instanceof Error ? error.message : String(error));
        await writer.abort(error);
      }
    })();

    return new Response(readable, {
      headers: {
        ...getCorsHeaders(request),
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    log.error('LLM error', { error: error instanceof Error ? error.message : String(error) });

    // Store error log
    await storeLlmLog(undefined, error instanceof Error ? error.message : String(error));

    // Fallback response using simple delimiter format
    const fallbackMessage = isFirstMessage ? "Hey there! I'm excited to shape a plan with you. **Which AI tools do you use?** ✨" : '**Could you tell me more about your goals?** 🧭';

    const fallbackJson = JSON.stringify({
      widget: {
        type: isFirstMessage ? 'multi-select' : 'free-text',
        options: isFirstMessage ? ['ChatGPT', 'Claude', 'GitHub Copilot', 'Gemini', 'Perplexity', 'Notion AI', 'Other'] : undefined,
      },
      profileXml,
      complete: false,
    });

    const fallbackResponse = `${fallbackMessage}\n<<<JSON_RESPONSE>>>\n${fallbackJson}`;

    // Store fallback log
    await storeLlmLog(fallbackResponse + '\n\n[FALLBACK USED]');

    return new Response(fallbackResponse, {
      headers: {
        ...getCorsHeaders(request),
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
});

/**
 * CORS preflight handler
 */
export const streamQuestionOptions = httpAction(async (_ctx, request) => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
});
