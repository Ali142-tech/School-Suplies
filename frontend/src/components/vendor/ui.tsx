'use client';

import { useEffect, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react';

export function Spinner({ size = 16 }: { size?: number }) { return <Loader2 size={size} className="spin" aria-hidden="true" />; }

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <div className="vp-head"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="actions">{actions}</div>}</div>;
}

export function Card({ title, description, actions, children, flush, className = '' }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; flush?: boolean; className?: string }) {
  return <section className={`vp-card${flush ? ' flush' : ''} ${className}`}>
    {(title || actions) && <div className="vp-card-head"><div>{title && <h3>{title}</h3>}{description && <p>{description}</p>}</div>{actions}</div>}
    <div className="vp-card-body">{children}</div>
  </section>;
}

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | '';
export function Badge({ tone = '', children }: { tone?: Tone; children: ReactNode }) { return <span className={`vp-badge ${tone}`}>{children}</span>; }

export function Stat({ label, value, hint, icon, tone = '' }: { label: string; value: ReactNode; hint?: string; icon: ReactNode; tone?: Tone }) {
  return <div className={`vp-stat ${tone}`}><i>{icon}</i><div><small>{label}</small><strong>{value}</strong>{hint && <em>{hint}</em>}</div></div>;
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return <div className="vp-empty">{icon}<h3>{title}</h3>{text && <p style={{ maxWidth: 380 }}>{text}</p>}{action && <div style={{ marginTop: 10 }}>{action}</div>}</div>;
}

export function Banner({ tone, title, children, action }: { tone: 'ok' | 'warn' | 'bad' | 'info'; title?: string; children?: ReactNode; action?: ReactNode }) {
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'bad' ? XCircle : tone === 'warn' ? AlertTriangle : Info;
  return <div className={`vp-banner ${tone}`} role={tone === 'bad' ? 'alert' : 'status'}><Icon size={18} /><div>{title && <b>{title}</b>}{children}</div>{action}</div>;
}

export function Skeleton({ h = 16, w = '100%' }: { h?: number; w?: number | string }) { return <span className="vp-skel" style={{ height: h, width: w }} />; }

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return <div style={{ padding: 18, display: 'grid', gap: 14 }} role="status" aria-label="Loading">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} h={18} />)}</div>;
}

/** Slide-over panel used for create/edit forms and detail views. Closes on Escape and on backdrop click. */
export function Drawer({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return <>
    <div className="vp-drawer-back" onClick={onClose} aria-hidden="true" />
    <aside className="vp-drawer" role="dialog" aria-modal="true" aria-label={title}>
      <header><h3>{title}</h3><button type="button" className="btn ghost icon" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
      <div className="body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </aside>
  </>;
}

export const statusTone = (status: string): Tone => ['active', 'published', 'delivered', 'quoted', 'ok'].includes(status) ? 'ok' : ['pending', 'draft', 'processing', 'submitted', 'shipped'].includes(status) ? 'warn' : ['rejected', 'suspended', 'cancelled', 'declined'].includes(status) ? 'bad' : 'info';
export const titleCase = (s: string) => s.replace(/[_-]/g, ' ').replace(/^\w/, c => c.toUpperCase());
