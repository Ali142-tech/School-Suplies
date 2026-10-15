import { ApiError } from '@/lib/api';

/** First validation message per field from a Laravel 422 response, e.g. { email: 'The email has already been taken.' }. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.details || typeof error.details !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(error.details as Record<string, unknown>)) {
    const first = Array.isArray(messages) ? messages.find(m => typeof m === 'string') : typeof messages === 'string' ? messages : undefined;
    if (typeof first === 'string') out[field] = first;
  }
  return out;
}

/** A message that is safe and useful to show a person, whatever went wrong. */
export function friendlyMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!(error instanceof ApiError)) return error instanceof Error && error.message ? error.message : fallback;
  if (error.status === 0) return 'We can’t reach the server right now. Check your internet connection and try again.';
  if (error.status === 429) return 'Too many attempts. Please wait a minute and try again.';
  if (error.status === 419) return 'Your session expired. Refresh the page and try again.';
  if (error.status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  if (error.status === 401) return 'Your session has expired. Please sign in again.';
  if (error.status === 403) return error.message && !/^API request failed/.test(error.message) ? error.message : 'You don’t have permission to do that.';
  if (error.status === 404) return 'We couldn’t find what you were looking for.';
  return error.message || fallback;
}

/** True when the API rejected the request with no per-field detail (e.g. wrong password). */
export function isCredentialError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 422 || error.status === 401) && Object.keys(fieldErrors(error)).length === 0;
}
