/**
 * Resolves the API base URL based on runtime environment.
 * On browser: returns '' (relative path) to leverage Vercel's public /api rewrites.
 * On server (SSR/Server Components): reads process.env.BACKEND_URL (injected by Vercel service binding),
 * falling back to local Express dev server at http://localhost:5000.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '';
  }
  return process.env.BACKEND_URL || 'http://localhost:5000';
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) return cleanPath;
  return `${base.replace(/\/$/, '')}${cleanPath}`;
}
