'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, type ApiPage } from '@/lib/api';
import { friendlyMessage } from '@/lib/errors';

/** Loads one page of a Laravel paginated endpoint. `path` may already contain a query string. `null` rows means "still loading". */
export function usePaged<T>(path: string | null, deps: unknown[] = []) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [meta, setMeta] = useState<ApiPage<T>['meta'] | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  // Changing filters (deps) always returns to the first page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, deps);

  const load = useCallback(async () => {
    if (!path) return;
    try {
      const res = await apiFetch<ApiPage<T>>(`${path}${path.includes('?') ? '&' : '?'}page=${page}`);
      setRows(res.data); setMeta(res.meta); setError('');
    } catch (cause) { setRows([]); setMeta(null); setError(friendlyMessage(cause, 'Could not load this list.')); }
  }, [path, page]);

  useEffect(() => { void load(); }, [load]);
  return { rows, meta, page, setPage, error, reload: load, setRows };
}
