'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type CartLine = { id: number; name: string; price: number; currency: string; qty: number; max: number; image?: string | null; type?: string };
type Cart = { lines: CartLine[]; count: number; subtotal: number; add: (line: Omit<CartLine, 'qty'>, qty?: number) => void; setQty: (id: number, qty: number) => void; remove: (id: number) => void; clear: () => void };

const KEY = 'printinf-school-cart';
const Ctx = createContext<Cart | null>(null);

function read(): CartLine[] {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(KEY) ?? '[]') as CartLine[];
    return Array.isArray(parsed) ? parsed.filter(l => l && Number.isInteger(l.id) && l.qty > 0) : [];
  } catch { return []; }
}
export function clearStoredSchoolCart() { try { window.sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ } }

/** A per-tab draft of what the school is about to order. It is only a convenience: the API re-checks price and stock at checkout. */
export function SchoolCartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { setLines(read()); setReady(true); }, []);
  useEffect(() => { if (ready) try { window.sessionStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* storage unavailable */ } }, [lines, ready]);

  const add = useCallback<Cart['add']>((line, qty = 1) => setLines(cur => {
    const found = cur.find(l => l.id === line.id);
    if (!found) return [...cur, { ...line, qty: Math.min(qty, line.max, 100) }];
    return cur.map(l => l.id === line.id ? { ...l, ...line, qty: Math.min(l.qty + qty, line.max, 100) } : l);
  }), []);
  const setQty = useCallback((id: number, qty: number) => setLines(cur => cur.map(l => l.id === id ? { ...l, qty: Math.max(1, Math.min(Math.floor(qty) || 1, l.max, 100)) } : l)), []);
  const remove = useCallback((id: number) => setLines(cur => cur.filter(l => l.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Cart>(() => ({ lines, add, setQty, remove, clear, count: lines.reduce((n, l) => n + l.qty, 0), subtotal: lines.reduce((n, l) => n + l.qty * l.price, 0) }), [lines, add, setQty, remove, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSchoolCart() {
  const value = useContext(Ctx);
  if (!value) throw new Error('useSchoolCart must be used inside SchoolCartProvider');
  return value;
}
