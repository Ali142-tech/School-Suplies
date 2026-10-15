'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
type Item = { id: number; kind: Kind; message: string };
type Api = { success: (message: string) => void; error: (message: string) => void; info: (message: string) => void; dismiss: (id: number) => void };

const ToastContext = createContext<Api | null>(null);
const LIMIT = 4;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const next = useRef(1);
  const dismiss = useCallback((id: number) => setItems(list => list.filter(item => item.id !== id)), []);
  const push = useCallback((kind: Kind, message: string) => {
    if (!message) return;
    setItems(list => {
      if (list.some(item => item.kind === kind && item.message === message)) return list; // never stack identical toasts
      return [...list, { id: next.current++, kind, message }].slice(-LIMIT);
    });
  }, []);
  const api = useMemo<Api>(() => ({ success: m => push('success', m), error: m => push('error', m), info: m => push('info', m), dismiss }), [push, dismiss]);

  return <ToastContext.Provider value={api}>
    {children}
    <div className="toast-region" aria-label="Notifications">
      {items.map(item => <ToastCard key={item.id} item={item} onClose={() => dismiss(item.id)} />)}
    </div>
  </ToastContext.Provider>;
}

function ToastCard({ item, onClose }: { item: Item; onClose: () => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(onClose, item.kind === 'error' ? 8000 : 4500);
    return () => window.clearTimeout(timer);
  }, [paused, item.kind, onClose]);
  const Icon = item.kind === 'success' ? CheckCircle2 : item.kind === 'error' ? AlertCircle : Info;
  return <div className={`toast-card ${item.kind}`} role={item.kind === 'error' ? 'alert' : 'status'} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <Icon size={20} aria-hidden="true" />
    <span>{item.message}</span>
    <button type="button" aria-label="Dismiss notification" onClick={onClose}><X size={16} /></button>
  </div>;
}

export function useToast(): Api {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used within ToastProvider');
  return value;
}
