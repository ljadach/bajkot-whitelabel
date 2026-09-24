/** Anything outside the order flow is a 404 — rendered by the root ErrorBoundary. */
export function loader() {
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw new Response('Not Found', { status: 404 });
}

export default function NotFound() {
  return null;
}
