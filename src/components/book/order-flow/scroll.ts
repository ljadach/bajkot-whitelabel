/**
 * The app shell scrolls `<main>` (root Layout wraps the Outlet in an
 * overflow-auto main), not `window` — so `window.scrollTo` is a silent no-op
 * everywhere in the order flow. Every screen transition must go through this
 * helper instead.
 */
export function scrollFlowToTop() {
  if (typeof document === 'undefined') return;
  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'auto' });
}
