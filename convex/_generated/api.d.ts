/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_bookBatch from '../admin/bookBatch.js';
import type * as admin_bookPrompts from '../admin/bookPrompts.js';
import type * as admin_config from '../admin/config.js';
import type * as admin_stripe from '../admin/stripe.js';
import type * as analytics from '../analytics.js';
import type * as analyticsHttp from '../analyticsHttp.js';
import type * as auth from '../auth.js';
import type * as backendLogs from '../backendLogs.js';
import type * as billing from '../billing.js';
import type * as bookAgents from '../bookAgents.js';
import type * as bookComposer from '../bookComposer.js';
import type * as bookComposerRender from '../bookComposerRender.js';
import type * as bookIntakeGuard from '../bookIntakeGuard.js';
import type * as bookPipeline from '../bookPipeline.js';
import type * as bookPipelineEvents from '../bookPipelineEvents.js';
import type * as bookPipelineHelpers from '../bookPipelineHelpers.js';
import type * as cli from '../cli.js';
import type * as config from '../config.js';
import type * as contact from '../contact.js';
import type * as crons from '../crons.js';
import type * as email from '../email.js';
import type * as feedback from '../feedback.js';
import type * as http from '../http.js';
import type * as leads from '../leads.js';
import type * as lib_actionHelpers from '../lib/actionHelpers.js';
import type * as lib_adminGuards from '../lib/adminGuards.js';
import type * as lib_ageBracket from '../lib/ageBracket.js';
import type * as lib_asciiToImage from '../lib/asciiToImage.js';
import type * as lib_bookAgentUtils from '../lib/bookAgentUtils.js';
import type * as lib_bookAgentUtilsV2 from '../lib/bookAgentUtilsV2.js';
import type * as lib_bookData from '../lib/bookData.js';
import type * as lib_bookTypes from '../lib/bookTypes.js';
import type * as lib_buildRenderBrief from '../lib/buildRenderBrief.js';
import type * as lib_childNameInflect from '../lib/childNameInflect.js';
import type * as lib_childPortrait from '../lib/childPortrait.js';
import type * as lib_config from '../lib/config.js';
import type * as lib_configClient from '../lib/configClient.js';
import type * as lib_consents from '../lib/consents.js';
import type * as lib_dbHelpers from '../lib/dbHelpers.js';
import type * as lib_email from '../lib/email.js';
import type * as lib_geminiImageGen from '../lib/geminiImageGen.js';
import type * as lib_jsonUtils from '../lib/jsonUtils.js';
import type * as lib_landingToken from '../lib/landingToken.js';
import type * as lib_langfuse from '../lib/langfuse.js';
import type * as lib_langfusePrompts from '../lib/langfusePrompts.js';
import type * as lib_langfuseRest from '../lib/langfuseRest.js';
import type * as lib_llmClient from '../lib/llmClient.js';
import type * as lib_logger from '../lib/logger.js';
import type * as lib_pageSequence from '../lib/pageSequence.js';
import type * as lib_pipelineConfig from '../lib/pipelineConfig.js';
import type * as lib_pipelineStateMachine from '../lib/pipelineStateMachine.js';
import type * as lib_prompts from '../lib/prompts.js';
import type * as lib_prompts_bookFallbacks from '../lib/prompts/bookFallbacks.js';
import type * as lib_prompts_types from '../lib/prompts/types.js';
import type * as lib_r2Presign from '../lib/r2Presign.js';
import type * as lib_rateLimiter from '../lib/rateLimiter.js';
import type * as lib_roles from '../lib/roles.js';
import type * as lib_security from '../lib/security.js';
import type * as lib_utils from '../lib/utils.js';
import type * as llmLogs from '../llmLogs.js';
import type * as pipelineConfig from '../pipelineConfig.js';
import type * as prompts from '../prompts.js';
import type * as rateLimitMutation from '../rateLimitMutation.js';
import type * as stripe from '../stripe.js';
import type * as stripeHttp from '../stripeHttp.js';

import type { ApiFromModules, FilterApi, FunctionReference } from 'convex/server';

declare const fullApi: ApiFromModules<{
  'admin/bookBatch': typeof admin_bookBatch;
  'admin/bookPrompts': typeof admin_bookPrompts;
  'admin/config': typeof admin_config;
  'admin/stripe': typeof admin_stripe;
  analytics: typeof analytics;
  analyticsHttp: typeof analyticsHttp;
  auth: typeof auth;
  backendLogs: typeof backendLogs;
  billing: typeof billing;
  bookAgents: typeof bookAgents;
  bookComposer: typeof bookComposer;
  bookComposerRender: typeof bookComposerRender;
  bookIntakeGuard: typeof bookIntakeGuard;
  bookPipeline: typeof bookPipeline;
  bookPipelineEvents: typeof bookPipelineEvents;
  bookPipelineHelpers: typeof bookPipelineHelpers;
  cli: typeof cli;
  config: typeof config;
  contact: typeof contact;
  crons: typeof crons;
  email: typeof email;
  feedback: typeof feedback;
  http: typeof http;
  leads: typeof leads;
  'lib/actionHelpers': typeof lib_actionHelpers;
  'lib/adminGuards': typeof lib_adminGuards;
  'lib/ageBracket': typeof lib_ageBracket;
  'lib/asciiToImage': typeof lib_asciiToImage;
  'lib/bookAgentUtils': typeof lib_bookAgentUtils;
  'lib/bookAgentUtilsV2': typeof lib_bookAgentUtilsV2;
  'lib/bookData': typeof lib_bookData;
  'lib/bookTypes': typeof lib_bookTypes;
  'lib/buildRenderBrief': typeof lib_buildRenderBrief;
  'lib/childNameInflect': typeof lib_childNameInflect;
  'lib/childPortrait': typeof lib_childPortrait;
  'lib/config': typeof lib_config;
  'lib/configClient': typeof lib_configClient;
  'lib/consents': typeof lib_consents;
  'lib/dbHelpers': typeof lib_dbHelpers;
  'lib/email': typeof lib_email;
  'lib/geminiImageGen': typeof lib_geminiImageGen;
  'lib/jsonUtils': typeof lib_jsonUtils;
  'lib/landingToken': typeof lib_landingToken;
  'lib/langfuse': typeof lib_langfuse;
  'lib/langfusePrompts': typeof lib_langfusePrompts;
  'lib/langfuseRest': typeof lib_langfuseRest;
  'lib/llmClient': typeof lib_llmClient;
  'lib/logger': typeof lib_logger;
  'lib/pageSequence': typeof lib_pageSequence;
  'lib/pipelineConfig': typeof lib_pipelineConfig;
  'lib/pipelineStateMachine': typeof lib_pipelineStateMachine;
  'lib/prompts': typeof lib_prompts;
  'lib/prompts/bookFallbacks': typeof lib_prompts_bookFallbacks;
  'lib/prompts/types': typeof lib_prompts_types;
  'lib/r2Presign': typeof lib_r2Presign;
  'lib/rateLimiter': typeof lib_rateLimiter;
  'lib/roles': typeof lib_roles;
  'lib/security': typeof lib_security;
  'lib/utils': typeof lib_utils;
  llmLogs: typeof llmLogs;
  pipelineConfig: typeof pipelineConfig;
  prompts: typeof prompts;
  rateLimitMutation: typeof rateLimitMutation;
  stripe: typeof stripe;
  stripeHttp: typeof stripeHttp;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, 'public'>>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, 'internal'>>;

export declare const components: {};
