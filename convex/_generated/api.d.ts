/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_config from "../admin/config.js";
import type * as admin_corpus from "../admin/corpus.js";
import type * as admin_debugContent from "../admin/debugContent.js";
import type * as admin_debugPrompts from "../admin/debugPrompts.js";
import type * as admin_segments from "../admin/segments.js";
import type * as admin_videoActions from "../admin/videoActions.js";
import type * as admin_videos from "../admin/videos.js";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as autoFillChat from "../autoFillChat.js";
import type * as backendLogs from "../backendLogs.js";
import type * as config from "../config.js";
import type * as contact from "../contact.js";
import type * as courseAi from "../courseAi.js";
import type * as courseAiHelpers from "../courseAiHelpers.js";
import type * as courseDocuments from "../courseDocuments.js";
import type * as diaryEntryAi from "../diaryEntryAi.js";
import type * as diaryEntryAiHelpers from "../diaryEntryAiHelpers.js";
import type * as exerciseAi from "../exerciseAi.js";
import type * as exercises from "../exercises.js";
import type * as exploreAi from "../exploreAi.js";
import type * as http from "../http.js";
import type * as instrumentAi from "../instrumentAi.js";
import type * as leads from "../leads.js";
import type * as learnerArtifacts from "../learnerArtifacts.js";
import type * as lib_actionHelpers from "../lib/actionHelpers.js";
import type * as lib_adminGuards from "../lib/adminGuards.js";
import type * as lib_chatMessage from "../lib/chatMessage.js";
import type * as lib_cloudflareStream from "../lib/cloudflareStream.js";
import type * as lib_config from "../lib/config.js";
import type * as lib_configClient from "../lib/configClient.js";
import type * as lib_corpusPreselection from "../lib/corpusPreselection.js";
import type * as lib_dbHelpers from "../lib/dbHelpers.js";
import type * as lib_editorialGuide from "../lib/editorialGuide.js";
import type * as lib_geminiClient from "../lib/geminiClient.js";
import type * as lib_googleDrive from "../lib/googleDrive.js";
import type * as lib_jsonUtils from "../lib/jsonUtils.js";
import type * as lib_langfuse from "../lib/langfuse.js";
import type * as lib_langfusePrompts from "../lib/langfusePrompts.js";
import type * as lib_langfuseRest from "../lib/langfuseRest.js";
import type * as lib_language from "../lib/language.js";
import type * as lib_languageValidator from "../lib/languageValidator.js";
import type * as lib_languages from "../lib/languages.js";
import type * as lib_llmClient from "../lib/llmClient.js";
import type * as lib_logger from "../lib/logger.js";
import type * as lib_pipelineConfig from "../lib/pipelineConfig.js";
import type * as lib_profileXml from "../lib/profileXml.js";
import type * as lib_prompts from "../lib/prompts.js";
import type * as lib_prompts_courseFallbacks from "../lib/prompts/courseFallbacks.js";
import type * as lib_prompts_exerciseFallbacks from "../lib/prompts/exerciseFallbacks.js";
import type * as lib_prompts_intakeFallbacks from "../lib/prompts/intakeFallbacks.js";
import type * as lib_prompts_toolFallbacks from "../lib/prompts/toolFallbacks.js";
import type * as lib_prompts_types from "../lib/prompts/types.js";
import type * as lib_rateLimiter from "../lib/rateLimiter.js";
import type * as lib_roles from "../lib/roles.js";
import type * as lib_streamParser from "../lib/streamParser.js";
import type * as lib_utils from "../lib/utils.js";
import type * as lib_videoProcessing from "../lib/videoProcessing.js";
import type * as llmLogs from "../llmLogs.js";
import type * as organizations from "../organizations.js";
import type * as pipelineConfig from "../pipelineConfig.js";
import type * as profiles from "../profiles.js";
import type * as progress from "../progress.js";
import type * as prompts from "../prompts.js";
import type * as quickTipAi from "../quickTipAi.js";
import type * as quickTipAiHelpers from "../quickTipAiHelpers.js";
import type * as rateLimitMutation from "../rateLimitMutation.js";
import type * as rewards from "../rewards.js";
import type * as seed from "../seed.js";
import type * as sessions from "../sessions.js";
import type * as streaming from "../streaming.js";
import type * as teamProgress from "../teamProgress.js";
import type * as videoLookup from "../videoLookup.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/config": typeof admin_config;
  "admin/corpus": typeof admin_corpus;
  "admin/debugContent": typeof admin_debugContent;
  "admin/debugPrompts": typeof admin_debugPrompts;
  "admin/segments": typeof admin_segments;
  "admin/videoActions": typeof admin_videoActions;
  "admin/videos": typeof admin_videos;
  ai: typeof ai;
  auth: typeof auth;
  autoFillChat: typeof autoFillChat;
  backendLogs: typeof backendLogs;
  config: typeof config;
  contact: typeof contact;
  courseAi: typeof courseAi;
  courseAiHelpers: typeof courseAiHelpers;
  courseDocuments: typeof courseDocuments;
  diaryEntryAi: typeof diaryEntryAi;
  diaryEntryAiHelpers: typeof diaryEntryAiHelpers;
  exerciseAi: typeof exerciseAi;
  exercises: typeof exercises;
  exploreAi: typeof exploreAi;
  http: typeof http;
  instrumentAi: typeof instrumentAi;
  leads: typeof leads;
  learnerArtifacts: typeof learnerArtifacts;
  "lib/actionHelpers": typeof lib_actionHelpers;
  "lib/adminGuards": typeof lib_adminGuards;
  "lib/chatMessage": typeof lib_chatMessage;
  "lib/cloudflareStream": typeof lib_cloudflareStream;
  "lib/config": typeof lib_config;
  "lib/configClient": typeof lib_configClient;
  "lib/corpusPreselection": typeof lib_corpusPreselection;
  "lib/dbHelpers": typeof lib_dbHelpers;
  "lib/editorialGuide": typeof lib_editorialGuide;
  "lib/geminiClient": typeof lib_geminiClient;
  "lib/googleDrive": typeof lib_googleDrive;
  "lib/jsonUtils": typeof lib_jsonUtils;
  "lib/langfuse": typeof lib_langfuse;
  "lib/langfusePrompts": typeof lib_langfusePrompts;
  "lib/langfuseRest": typeof lib_langfuseRest;
  "lib/language": typeof lib_language;
  "lib/languageValidator": typeof lib_languageValidator;
  "lib/languages": typeof lib_languages;
  "lib/llmClient": typeof lib_llmClient;
  "lib/logger": typeof lib_logger;
  "lib/pipelineConfig": typeof lib_pipelineConfig;
  "lib/profileXml": typeof lib_profileXml;
  "lib/prompts": typeof lib_prompts;
  "lib/prompts/courseFallbacks": typeof lib_prompts_courseFallbacks;
  "lib/prompts/exerciseFallbacks": typeof lib_prompts_exerciseFallbacks;
  "lib/prompts/intakeFallbacks": typeof lib_prompts_intakeFallbacks;
  "lib/prompts/toolFallbacks": typeof lib_prompts_toolFallbacks;
  "lib/prompts/types": typeof lib_prompts_types;
  "lib/rateLimiter": typeof lib_rateLimiter;
  "lib/roles": typeof lib_roles;
  "lib/streamParser": typeof lib_streamParser;
  "lib/utils": typeof lib_utils;
  "lib/videoProcessing": typeof lib_videoProcessing;
  llmLogs: typeof llmLogs;
  organizations: typeof organizations;
  pipelineConfig: typeof pipelineConfig;
  profiles: typeof profiles;
  progress: typeof progress;
  prompts: typeof prompts;
  quickTipAi: typeof quickTipAi;
  quickTipAiHelpers: typeof quickTipAiHelpers;
  rateLimitMutation: typeof rateLimitMutation;
  rewards: typeof rewards;
  seed: typeof seed;
  sessions: typeof sessions;
  streaming: typeof streaming;
  teamProgress: typeof teamProgress;
  videoLookup: typeof videoLookup;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
