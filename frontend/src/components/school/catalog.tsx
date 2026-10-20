'use client';

import Link from '@/components/store-link';
import { useMemo, useState } from 'react';
import { Check, ImageIcon, Package, Printer, ShoppingCart } from 'lucide-react';
import { money } from '@/lib/data';
import { useToast } from '@/components/toast';
import { usePaged } from '@/lib/use-paged';
import { Badge, Banner, Card, Chips, Empty, PageHeader, Pager, SearchBox, Skeleton } from '@/components/portal/ui';
import { useSchoolCart } from './cart';

type Product = {
  id: number; name: string; description?: string | null; price: string | number; currency: string; type: 'supply' | 'print';
  category?: { name: string } | null; images?: { url?: string; alt_text?: string | null }[]; inventory?: { quantity: number } | null;
  printing_specification?: { sizes?: string[] | null; paper_types?: string[] | null; finishes?: string[] | null } | null;
};
const TYPES = ['all', 'supply', 'print'] as const;
const LABEL = { all: 'Everything', supply: 'School supplies', print: 'Printing' } as const;

export function SchoolCatalog() {
  const toast = useToast();
  const cart = useSchoolCart();
  const [type, setType] = useState<(typeof TYPES)[number]>('all');
  const [q, setQ] = useState('');
  const list = usePaged<Product>(`/v1/school/products${type === 'all' ? '' : `?type=${type}`}`, [type]);
  const shown = useMemo(() => (list.rows ?? []).filter(p => !q.trim() || [p.name, p.category?.name, p.description].some(x => x?.toLowerCase().includes(q.trim().toLowerCase()))), [list.rows, q]);

  function add(p: Product) {
    const max = p.inventory?.quantity ?? 0;
    const inCart = cart.lines.find(l => l.id === p.id)?.qty ?? 0;
    if (inCart >= max) return toast.info(`Only ${max} in stock.`);
    cart.add({ id: p.id, name: p.name, price: Number(p.price), currency: p.currency, max, image: p.images?.[0]?.url ?? null, type: p.type });
    toast.success(`${p.name} added to your basket.`);
  }

  return <>
    <PageHeader title="Catalog" description="Everything your store offers. Add items to your basket, then check out once." actions={<Link className="btn primary" href="/school/cart"><ShoppingCart size={15} />Basket{cart.count > 0 && ` (${cart.count})`}</Link>} />
    <Card flush>
      <div className="vp-toolbar"><Chips options={TYPES} value={type} onChange={setType} label="Product type" format={t => LABEL[t]} /><span style={{ flex: 1 }} /><SearchBox value={q} onChange={setQ} placeholder="Search this page…" /></div>
      {list.error && <div style={{ padding: 18 }}><Banner tone="bad">{list.error}</Banner></div>}
      {list.rows === null ? <div className="vp-grid">{[0, 1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} className="vp-product"><Skeleton h={150} /><div className="meta"><Skeleton h={14} w="70%" /><Skeleton h={12} /></div></div>)}</div>
        : shown.length === 0 ? <Empty icon={<Package />} title={q ? 'No matches' : 'Nothing available yet'} text={q ? 'Try a different search.' : 'Your store hasn’t published any products or printing services yet. Check back soon.'} />
        : <div className="vp-grid">{shown.map(p => {
          const stock = p.inventory?.quantity ?? 0;
          const inCart = cart.lines.find(l => l.id === p.id)?.qty ?? 0;
          const spec = p.printing_specification;
          return <article className="vp-product" key={p.id}>
            <div className="img">{p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.images[0].alt_text || p.name} loading="lazy" /> : p.type === 'print' ? <Printer size={34} /> : <ImageIcon size={34} />}</div>
            <div className="meta">
              <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><Badge tone={p.type === 'print' ? 'info' : ''}>{p.type === 'print' ? 'Printing' : p.category?.name ?? 'Supplies'}</Badge>{stock > 0 && stock <= 5 && <Badge tone="warn">Only {stock} left</Badge>}</span>
              <h4>{p.name}</h4>
              {p.description && <p>{p.description}</p>}
              {p.type === 'print' && spec && <p>{[spec.sizes?.length && `${spec.sizes.length} sizes`, spec.paper_types?.length && `${spec.paper_types.length} papers`, spec.finishes?.length && `${spec.finishes.length} finishes`].filter(Boolean).join(' · ')}</p>}
            </div>
            <div className="foot"><span className="price">{money(Number(p.price), p.currency)}</span>
              {stock === 0 ? <Badge tone="bad">Out of stock</Badge> : <button className={`btn sm${inCart ? '' : ' primary'}`} onClick={() => add(p)}>{inCart ? <><Check size={14} />In basket ({inCart})</> : 'Add to basket'}</button>}</div>
          </article>;
        })}</div>}
      <Pager meta={list.meta} page={list.page} onPage={list.setPage} />
    </Card>
  </>;
}
