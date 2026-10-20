'use client';

import Link, { useStorePathname } from '@/components/store-link';
import { useEffect, useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { SafeLink } from '@/components/cms/rich-text';
import { useStore } from '@/components/store';
import type { SiteLink } from '@/lib/site';

/** Responsive navigation for the vendor website header: inline links on desktop, a toggled panel on mobile. */
export function SiteNav({ items, action }: { items: SiteLink[]; action: SiteLink }) {
  const path = useStorePathname();
  const [open, setOpen] = useState(false);
  const { items: cartLines } = useStore();
  const cartCount = cartLines.reduce((total, line) => total + line.quantity, 0);
  useEffect(() => { setOpen(false); }, [path]);
  const current = (url: string) => (url === path ? 'page' : undefined);
  return <>
    <nav className="vs-nav" aria-label="Main">
      {items.map(item => <SafeLink key={item.url + item.label} href={item.url} className={item.url === path ? 'vs-link active' : 'vs-link'}>{item.label}</SafeLink>)}
    </nav>
    <div className="vs-actions">
      <Link className="vs-cart" href="/cart" aria-label={`Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}><ShoppingBag size={18} />{cartCount > 0 && <b>{cartCount}</b>}</Link>
      <Link className="vs-action" href={action.url}>{action.label}</Link>
      <button type="button" className="vs-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="vs-mobile" onClick={() => setOpen(v => !v)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
    </div>
    {open && <nav id="vs-mobile" className="vs-mobile" aria-label="Mobile">
      {items.map(item => <SafeLink key={item.url + item.label} href={item.url} className="vs-mobile-link">{<span aria-current={current(item.url)}>{item.label}</span>}</SafeLink>)}
      <Link className="vs-mobile-link" href="/cart">Cart{cartCount > 0 ? ` (${cartCount})` : ''}</Link>
      <Link className="vs-mobile-link" href={action.url}>{action.label}</Link>
    </nav>}
  </>;
}
