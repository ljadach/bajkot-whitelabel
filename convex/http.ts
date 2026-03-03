import { httpRouter } from 'convex/server';
import { streamQuestion, streamQuestionOptions } from './streaming';

const http = httpRouter();

// Streaming endpoint for intake chat
// Simple direct streaming - no persistence, just LLM → browser
http.route({
  path: '/stream-question',
  method: 'POST',
  handler: streamQuestion,
});

http.route({
  path: '/stream-question',
  method: 'OPTIONS',
  handler: streamQuestionOptions,
});

export default http;
