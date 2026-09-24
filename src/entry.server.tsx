import { renderToReadableStream } from 'react-dom/server';
import { type EntryContext, ServerRouter } from 'react-router';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  entryContext: EntryContext,
) {
  const body = await renderToReadableStream(
    <ServerRouter context={entryContext} url={request.url} />,
    {
      onError(error: unknown) {
        // Log SSR errors but don't fail the response — components that need
        // browser-only providers (Convex) will show Suspense fallbacks.
        console.error('SSR render error:', error);
      },
    },
  );

  // Wait for all Suspense boundaries to resolve for full prerendered HTML.
  // Components that throw during SSR (e.g., Convex hooks without provider)
  // will show their Suspense fallback in the output.
  await body.allReady;

  responseHeaders.set('Content-Type', 'text/html');
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
