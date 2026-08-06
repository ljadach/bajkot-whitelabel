/**
 * The app shell (root.tsx) renders the router outlet inside an overflow-auto
 * <main> — that element is the app's scroll container, NOT window, so
 * `window.scrollTo` is a silent no-op everywhere. This module is the single
 * owner of that fact; anything that needs "scroll the app to top" calls this.
 */
export function scrollAppToTop() {
  if (typeof document === 'undefined') return;
  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'auto' });
}
