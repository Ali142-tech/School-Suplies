const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8001/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export type ApiPage<T> = { data: T[]; meta: { current_page: number; last_page: number; per_page: number; total: number } };
export type ApiData<T> = { data: T; message?: string };

const TOKEN_KEY = 'printinf-access-token';
export function saveAccessToken(token: string) { if (typeof window !== 'undefined') window.sessionStorage.setItem(TOKEN_KEY, token); }
export function clearAccessToken() { if (typeof window !== 'undefined') window.sessionStorage.removeItem(TOKEN_KEY); }
export function hasAccessToken() { return typeof window !== 'undefined' && !!window.sessionStorage.getItem(TOKEN_KEY); }

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (typeof window !== 'undefined') {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    const hostname = window.location.hostname.toLowerCase();
    const platformDomain = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? '').toLowerCase();
    const isLocalRoot = hostname === 'localhost' || hostname === '127.0.0.1';
    const isPlatformRoot = platformDomain && (hostname === platformDomain || hostname === `www.${platformDomain}`);
    if (!isLocalRoot && !isPlatformRoot && !headers.has('X-Store-Host')) headers.set('X-Store-Host', hostname);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers, cache: init.cache ?? 'no-store' });
  } catch (error) {
    void error;
    throw new ApiError('We can’t reach the server right now. Check your internet connection and try again.', 0);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload: unknown = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : undefined;
    const validation = body?.errors && typeof body.errors === 'object'
      ? Object.values(body.errors as Record<string, unknown>).flat().find(value => typeof value === 'string')
      : undefined;
    const message = (typeof validation === 'string' ? validation : undefined)
      ?? (typeof body?.message === 'string' ? body.message : undefined)
      ?? `API request failed (${response.status}).`;
    const friendly = response.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : response.status >= 500 ? 'Something went wrong on our side. Please try again in a moment.' : message;
    throw new ApiError(friendly, response.status, body?.errors);
  }

  return payload as T;
}

export const useMockData = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';
