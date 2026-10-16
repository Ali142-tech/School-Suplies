'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ImagePlus, Package, Pencil, PackagePlus, Search, Trash2 } from 'lucide-react';
import { apiFetch, ApiError, type ApiData, type ApiPage } from '@/lib/api';
import { money } from '@/lib/data';
import { fieldErrors, friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/toast';
import { ConfirmDialog } from '@/components/cms/confirm-dialog';
import { useVendorSession } from '@/components/vendor-shell';
import { Badge, Banner, Drawer, Empty, PageHeader, Spinner, TableSkeleton, Card, titleCase, type Tone } from './ui';

type Product = {
  id: number; name: string; slug: string; description?: string | null; price: string; currency: string; status: string; type: string;
  category_id?: number | null; category?: { id: number; name: string } | null;
  inventory?: { quantity: number; low_stock_threshold: number } | null; images?: { id: number; url: string }[];
};
type Category = { id: number; name: string };
type Meta = ApiPage<Product>['meta'];

const FILTERS = [['all', 'All'], ['published', 'Published'], ['draft', 'Draft'], ['low', 'Low stock']] as const;

export function VendorProducts({ startOpen = false }: { startOpen?: boolean }) {
  const session = useVendorSession();
  const toast = useToast();
  const vendor = session?.vendor;
  const canEdit = ['owner', 'manager'].includes(session?.role ?? '') && vendor?.status === 'active';
  const [items, setItems] = useState<Product[] | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('all');
  const [drawer, setDrawer] = useState<{ product: Product | null } | null>(startOpen ? { product: null } : null);
  const [removing, setRemoving] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!vendor) return;
    try {
      const res = await apiFetch<ApiPage<Product>>(`/v1/vendor/${vendor.slug}/products?page=${page}`);
      setItems(res.data); setMeta(res.meta); setError('');
    } catch (cause) { setError(friendlyMessage(cause, 'Could not load your products.')); setItems([]); }
  }, [vendor, page]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!vendor) return;
    apiFetch<ApiData<Category[]>>(`/v1/vendor/${vendor.slug}/categories`).then(r => setCategories(r.data)).catch(() => setCategories([]));
  }, [vendor]);

  const visible = useMemo(() => (items ?? []).filter(p => {
    if (query && !`${p.name} ${p.category?.name ?? ''}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'published' || filter === 'draft') return p.status === filter;
    if (filter === 'low') return !!p.inventory && p.inventory.quantity <= p.inventory.low_stock_threshold;
    return true;
  }), [items, query, filter]);

  async function toggleStatus(p: Product) {
    if (!vendor) return;
    const status = p.status === 'published' ? 'draft' : 'published';
    try {
      await apiFetch(`/v1/vendor/${vendor.slug}/products/${p.id}`, { method: 'PUT', body: JSON.stringify({ name: p.name, price: p.price, status }) });
      toast.success(status === 'published' ? `“${p.name}” is now visible in your store.` : `“${p.name}” was moved back to draft.`);
      await load();
    } catch (cause) { toast.error(friendlyMessage(cause, 'Could not update the product.')); }
  }

  async function archive() {
    if (!vendor || !removing) return;
    setBusy(true);
    try {
      await apiFetch(`/v1/vendor/${vendor.slug}/products/${removing.id}`, { method: 'DELETE' });
      toast.success(`“${removing.name}” was archived.`); setRemoving(null); await load();
    } catch (cause) { toast.error(friendlyMessage(cause, 'Could not archive the product.')); } finally { setBusy(false); }
  }

  const stockBadge = (p: Product): [Tone, string] => {
    const q = p.inventory?.quantity ?? 0;
    if (q === 0) return ['bad', 'Out of stock'];
    if (q <= (p.inventory?.low_stock_threshold ?? 5)) return ['warn', `${q} left`];
    return ['ok', `${q} in stock`];
  };

  return <>
    <PageHeader title="Products" description="Everything you sell. Keep drafts private until they’re ready."
      actions={<button className="btn primary" disabled={!canEdit} onClick={() => setDrawer({ product: null })}><PackagePlus size={15} />Add product</button>} />
    {vendor && vendor.status !== 'active' && <Banner tone="info">Product editing unlocks once your store is approved.</Banner>}
    {error && <Banner tone="bad">{error}</Banner>}

    <Card flush>
      <div className="vp-toolbar">
        <label className="vp-search"><Search size={16} /><input placeholder="Search products…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search products" /></label>
        <div className="vp-chips" role="group" aria-label="Filter products">{FILTERS.map(([key, label]) => <button key={key} className={`vp-chip${filter === key ? ' on' : ''}`} onClick={() => setFilter(key)}>{label}</button>)}</div>
      </div>
      {items === null ? <TableSkeleton /> : items.length === 0 ? <Empty icon={<Package />} title="No products yet" text="Add your first product to start selling." action={canEdit && <button className="btn primary" onClick={() => setDrawer({ product: null })}><PackagePlus size={15} />Add product</button>} />
        : visible.length === 0 ? <Empty icon={<Search />} title="No matching products" text="Try a different search or filter." />
        : <div className="table-scroll"><table>
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr></thead>
          <tbody>{visible.map(p => { const [tone, label] = stockBadge(p); return <tr key={p.id}>
            <td><div className="vp-cell"><span className="vp-thumb">{p.images?.[0]?.url ? <img src={p.images[0].url} alt="" /> : <Package size={18} />}</span><div><b>{p.name}</b><div className="muted" style={{ fontSize: 12 }}>{p.type === 'print' ? 'Printing' : 'School supplies'}</div></div></div></td>
            <td>{p.category?.name ?? <span className="muted">—</span>}</td>
            <td><b>{money(Number(p.price), p.currency)}</b></td>
            <td><Badge tone={tone}>{label}</Badge></td>
            <td><Badge tone={p.status === 'published' ? 'ok' : 'warn'}>{titleCase(p.status)}</Badge></td>
            <td><div className="vp-row-actions">
              {canEdit && <button className="btn sm" onClick={() => void toggleStatus(p)}>{p.status === 'published' ? 'Unpublish' : 'Publish'}</button>}
              <button className="btn sm icon" style={{ width: 32 }} onClick={() => setDrawer({ product: p })} disabled={!canEdit} aria-label={`Edit ${p.name}`}><Pencil size={14} /></button>
              <button className="btn sm icon danger" style={{ width: 32 }} onClick={() => setRemoving(p)} disabled={!canEdit} aria-label={`Archive ${p.name}`}><Trash2 size={14} /></button>
            </div></td>
          </tr>; })}</tbody>
        </table></div>}
      {meta && meta.last_page > 1 && <div className="vp-pager"><span>Page {meta.current_page} of {meta.last_page} · {meta.total} products</span><div style={{ display: 'flex', gap: 8 }}><button className="btn sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><button className="btn sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>Next</button></div></div>}
    </Card>

    {drawer && vendor && <ProductDrawer key={drawer.product?.id ?? 'new'} slug={vendor.slug} product={drawer.product} categories={categories}
      onClose={() => { setDrawer(null); if (startOpen) window.history.replaceState(null, '', '/vendor/products'); }} onSaved={() => { setDrawer(null); void load(); }} />}
    <ConfirmDialog open={!!removing} danger title="Archive this product?" message={`“${removing?.name ?? ''}” will be removed from your store. Existing orders are not affected.`} confirmLabel="Archive product" busy={busy} onCancel={() => setRemoving(null)} onConfirm={() => void archive()} />
    {!categories.length && items && items.length > 0 && <p className="muted" style={{ fontSize: 13 }}>Tip: <Link href="/vendor/categories" style={{ color: 'var(--vp-brand)', fontWeight: 600 }}>create categories</Link> to help customers browse.</p>}
  </>;
}

function ProductDrawer({ slug, product, categories, onClose, onSaved }: { slug: string; product: Product | null; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);
  const formId = 'product-form';

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const body = {
      name: String(f.get('name')).trim(), category_id: f.get('category_id') ? Number(f.get('category_id')) : null, description: String(f.get('description') ?? '') || null,
      price: f.get('price'), currency: 'PKR', type: f.get('type'), status: f.get('status'), quantity: Number(f.get('quantity') || 0), low_stock_threshold: Number(f.get('low_stock_threshold') || 5),
    };
    setBusy(true); setErrors({});
    try {
      const res = await apiFetch<ApiData<Product>>(`/v1/vendor/${slug}/products${product ? `/${product.id}` : ''}`, { method: product ? 'PUT' : 'POST', body: JSON.stringify(body) });
      let failed = 0;
      for (const file of files) {
        const upload = new FormData(); upload.append('image', file); upload.append('alt_text', body.name);
        try { await apiFetch(`/v1/vendor/${slug}/products/${res.data.id}/images`, { method: 'POST', body: upload }); } catch { failed++; }
      }
      if (failed) toast.error(`${failed} image${failed === 1 ? '' : 's'} could not be uploaded (max 5 MB, JPG/PNG/WebP).`);
      toast.success(product ? 'Product updated.' : 'Product added.');
      onSaved();
    } catch (cause) {
      const byField = cause instanceof ApiError ? fieldErrors(cause) : {};
      setErrors(Object.keys(byField).length ? byField : { _form: friendlyMessage(cause, 'Could not save the product.') });
    } finally { setBusy(false); }
  }

  const err = (k: string) => errors[k] ? <small className="field-error" role="alert">{errors[k]}</small> : null;
  return <Drawer open title={product ? 'Edit product' : 'Add product'} onClose={onClose} footer={<>
    <button type="button" className="btn" onClick={onClose}>Cancel</button>
    <button form={formId} className="btn primary" disabled={busy}>{busy ? <><Spinner />Saving…</> : 'Save product'}</button></>}>
    <form id={formId} className="form-grid" onSubmit={save}>
      {errors._form && <div className="form-wide notice" role="alert">{errors._form}</div>}
      <div className={`form-field form-wide${errors.name ? ' has-error' : ''}`}><label htmlFor="p-name">Name</label><input id="p-name" name="name" defaultValue={product?.name} maxLength={180} required />{err('name')}</div>
      <div className="form-field"><label htmlFor="p-cat">Category</label><select id="p-cat" name="category_id" defaultValue={product?.category_id ?? ''}><option value="">Uncategorized</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{err('category_id')}</div>
      <div className="form-field"><label htmlFor="p-type">Type</label><select id="p-type" name="type" defaultValue={product?.type ?? 'supply'}><option value="supply">School supplies</option><option value="print">Printing</option></select></div>
      <div className={`form-field${errors.price ? ' has-error' : ''}`}><label htmlFor="p-price">Price (PKR)</label><input id="p-price" name="price" type="number" min="0" step="0.01" defaultValue={product?.price} required />{err('price')}</div>
      <div className="form-field"><label htmlFor="p-status">Visibility</label><select id="p-status" name="status" defaultValue={product?.status ?? 'draft'}><option value="draft">Draft — hidden</option><option value="published">Published — visible</option></select></div>
      <div className="form-field"><label htmlFor="p-qty">Stock quantity</label><input id="p-qty" name="quantity" type="number" min="0" defaultValue={product?.inventory?.quantity ?? 0} required />{err('quantity')}</div>
      <div className="form-field"><label htmlFor="p-low">Low-stock alert at</label><input id="p-low" name="low_stock_threshold" type="number" min="0" defaultValue={product?.inventory?.low_stock_threshold ?? 5} /><small>You’ll be flagged when stock reaches this number.</small></div>
      <div className={`form-field form-wide${errors.description ? ' has-error' : ''}`}><label htmlFor="p-desc">Description</label><textarea id="p-desc" name="description" defaultValue={product?.description ?? ''} maxLength={10000} />{err('description')}</div>
      <div className="form-field form-wide"><label>Photos</label>
        {(product?.images?.length || previews.length) ? <div className="vp-imgs">
          {product?.images?.map(i => <figure key={i.id}><img src={i.url} alt="" /></figure>)}
          {previews.map(src => <figure key={src}><img src={src} alt="New upload preview" /></figure>)}
        </div> : null}
        <label className="vp-drop"><ImagePlus size={22} /><span><b style={{ color: 'var(--vp-ink)' }}>Click to add photos</b><br /><small>JPG, PNG or WebP · up to 5 MB each</small></span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => setFiles(Array.from(e.target.files ?? []))} /></label>
      </div>
    </form>
  </Drawer>;
}
