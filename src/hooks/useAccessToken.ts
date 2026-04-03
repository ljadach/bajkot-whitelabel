const STORAGE_KEY = 'bajkot_access_token';

export function captureTokenFromUrl(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) {
    localStorage.setItem(STORAGE_KEY, token);
    // Remove token from URL without reload
    params.delete('token');
    const clean = params.toString();
    const url = window.location.pathname + (clean ? `?${clean}` : '');
    window.history.replaceState({}, '', url);
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function hasAccessToken(): boolean {
  return !!getAccessToken();
}
