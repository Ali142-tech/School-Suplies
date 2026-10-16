'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import type { ApiPage } from '@/lib/api';
import { Spinner } from '@/components/vendor/ui';

// One design system for every portal: the vendor kit is the base, and these are the shared extras on top of it.
export * from '@/components/vendor/ui';

export function SearchBox({ value, onChange, placeholder = 'Search…', label = 'Search' }: { value: string; onChange: (value: string) => void; placeholder?: string; label?: string }) {
  return <div className="vp-search"><Search size={16} aria-hidden="true" /><input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={label} /></div>;
}

export function Chips<T extends string>({ options, value, onChange, label, format }: { options: readonly T[]; value: T; onChange: (value: T) => void; label: string; format?: (value: T) => string }) {
  return <div className="vp-chips" role="group" aria-label={label}>{options.map(o => <button key={o} type="button" className={`vp-chip${value === o ? ' on' : ''}`} aria-pressed={value === o} onClick={() => onChange(o)}>{format ? format(o) : o}</button>)}</div>;
}

export function Pager({ meta, page, onPage }: { meta: ApiPage<unknown>['meta'] | null; page: number; onPage: (page: number) => void }) {
  if (!meta || meta.last_page <= 1) return null;
  return <div className="vp-pager"><span>Page {meta.current_page} of {meta.last_page} · {meta.total} total</span>
    <div style={{ display: 'flex', gap: 8 }}><button className="btn sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><button className="btn sm" disabled={page >= meta.last_page} onClick={() => onPage(page + 1)}>Next</button></div></div>;
}

/** Centered confirmation modal for destructive or irreversible actions. Optional children hold extra inputs (a reason, a slug…). */
export function ConfirmModal({ open, title, text, confirmLabel, tone = 'primary', busy = false, disabled = false, onConfirm, onCancel, children }: {
  open: boolean; title: string; text?: string; confirmLabel: string; tone?: 'primary' | 'danger'; busy?: boolean; disabled?: boolean; onConfirm: () => void; onCancel: () => void; children?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open, busy, onCancel]);
  if (!open) return null;
  return <><div className="vp-drawer-back" onClick={() => { if (!busy) onCancel(); }} aria-hidden="true" />
    <div className="vp-modal" role="dialog" aria-modal="true" aria-label={title}>
      <h3>{title}</h3>{text && <p className="muted">{text}</p>}
      {children && <div className="vp-modal-body">{children}</div>}
      <div className="vp-modal-actions"><button className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={`btn ${tone === 'danger' ? 'danger-solid' : 'primary'}`} onClick={onConfirm} disabled={busy || disabled}>{busy ? <><Spinner />Working…</> : confirmLabel}</button></div>
    </div></>;
}

/** Settles after `ms` of no change; keeps live search from firing on every keystroke. */
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = window.setTimeout(() => setV(value), ms); return () => window.clearTimeout(t); }, [value, ms]);
  return v;
}

export const fmtDate = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
export const fmtDateTime = (iso?: string | null) => iso ? new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export function Submit({ busy, busyText, children }: { busy: boolean; busyText: string; children: ReactNode }) {
  return <button className="btn primary" disabled={busy} aria-busy={busy}>{busy ? <><Spinner />{busyText}</> : children}</button>;
}

/** Form-level `onInput` that clears the inline error of whichever field the person is editing. */
export const clearErrorOnInput = (setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>) => (event: React.FormEvent<HTMLFormElement>) => {
  const name = (event.target as HTMLInputElement).name;
  if (name) setErrors(old => (old[name] ? { ...old, [name]: '' } : old));
};
