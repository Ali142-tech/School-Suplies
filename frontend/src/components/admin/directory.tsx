'use client';

import { useMemo, useState } from 'react';
import { Boxes, CreditCard, Globe, Receipt, Tags, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { money } from '@/lib/data';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/toast';
import { usePaged } from '@/lib/use-paged';
import { Badge, Banner, Card, Chips, ConfirmModal, Drawer, Empty, PageHeader, Pager, SearchBox, Spinner, TableSkeleton, fmtDate, statusTone, titleCase } from '@/components/portal/ui';
import { useAdminSession } from './shell';

/** Shared list chrome: toolbar, error banner, skeleton, empty state, table and pager. */
function ListCard<T>({ list, toolbar, empty, children }: { list: ReturnType<typeof usePaged<T>>; toolbar?: React.ReactNode; empty: { icon: React.ReactNode; title: string; text?: string }; children: (rows: T[]) => React.ReactNode }) {
  return <Card flush>
    {toolbar && <div className="vp-toolbar">{toolbar}</div>}
    {list.error && <div style={{ padding: 18 }}><Banner tone="bad">{list.error}</Banner></div>}
    {list.rows === null ? <TableSkeleton /> : list.rows.length === 0 ? <Empty {...empty} /> : <div className="table-scroll">{children(list.rows)}</div>}
    <Pager meta={list.meta} page={list.page} onPage={list.setPage} />
  </Card>;
}
const matches = (q: string, ...values: (string | null | undefined)[]) => !q.trim() || values.some(v => v?.toLowerCase().includes(q.trim().toLowerCase()));

/* ------------------------------ users ------------------------------ */
type User = { id: number; name: string; email: string; role: string; is_active: boolean; created_at: string };
const ROLES = ['all', 'customer', 'school', 'vendor', 'platform_admin'] as const;

export function AdminUsers() {
  const toast = useToast();
  const me = useAdminSession()?.user;
  const list = usePaged<User>('/v1/admin/users');
  const [role, setRole] = useState<(typeof ROLES)[number]>('all');
  const [q, setQ] = useState('');
  const [target, setTarget] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!target) return;
    setBusy(true);
    try {
      await apiFetch(`/v1/admin/users/${target.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !target.is_active }) });
      toast.success(target.is_active ? `${target.name} was deactivated and signed out.` : `${target.name} was reactivated.`);
      setTarget(null); await list.reload();
    } catch (cause) { toast.error(friendlyMessage(cause, 'Could not update this account.')); } finally { setBusy(false); }
  }

  return <>
    <PageHeader title="Users & schools" description="Every account on the platform. Deactivating an account signs it out immediately; deactivating a school account also pauses the school." />
    <ListCard list={list} empty={{ icon: <Users />, title: 'No users yet' }}
      toolbar={<><Chips options={ROLES} value={role} onChange={setRole} label="Filter by role" format={r => r === 'all' ? 'All' : titleCase(r)} /><span style={{ flex: 1 }} /><SearchBox value={q} onChange={setQ} placeholder="Search this page…" /></>}>
      {rows => <table><thead><tr><th>Name</th><th>Role</th><th>Joined</th><th>Status</th><th /></tr></thead><tbody>
        {rows.filter(u => (role === 'all' || u.role === role) && matches(q, u.name, u.email)).map(u => <tr key={u.id}>
          <td><b>{u.name}</b><br /><span className="muted" style={{ fontSize: 12 }}>{u.email}</span></td><td><Badge tone={u.role === 'platform_admin' ? 'info' : ''}>{titleCase(u.role)}</Badge></td>
          <td>{fmtDate(u.created_at)}</td><td><Badge tone={u.is_active ? 'ok' : 'bad'}>{u.is_active ? 'Active' : 'Inactive'}</Badge></td>
          <td><div className="vp-row-actions">{u.id === me?.id ? <span className="muted" style={{ fontSize: 12 }}>You</span> : <button className={`btn sm${u.is_active ? ' danger' : ''}`} onClick={() => setTarget(u)}>{u.is_active ? 'Deactivate' : 'Activate'}</button>}</div></td></tr>)}
      </tbody></table>}
    </ListCard>
    <ConfirmModal open={!!target} busy={busy} tone={target?.is_active ? 'danger' : 'primary'} title={target?.is_active ? 'Deactivate this account?' : 'Reactivate this account?'}
      text={target ? (target.is_active ? `${target.name} will be signed out everywhere and unable to sign in until reactivated.` : `${target.name} will be able to sign in again.`) : ''}
      confirmLabel={target?.is_active ? 'Deactivate' : 'Reactivate'} onConfirm={() => void toggle()} onCancel={() => setTarget(null)} />
  </>;
}

/* ----------------------------- products ----------------------------- */
type Product = { id: number; name: string; slug: string; price: string; currency: string; status: string; type: string; is_featured?: boolean; vendor?: { name: string } | null; created_at: string };
const PSTATUS = ['all', 'published', 'draft', 'archived'] as const;

export function AdminProducts() {
  const toast = useToast();
  const list = usePaged<Product>('/v1/admin/products');
  const [status, setStatus] = useState<(typeof PSTATUS)[number]>('all');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  async function patch(p: Product, body: Record<string, unknown>, done: string) {
    setBusyId(p.id);
    try { await apiFetch(`/v1/admin/products/${p.id}`, { method: 'PATCH', body: JSON.stringify(body) }); toast.success(done); await list.reload(); }
    catch (cause) { toast.error(friendlyMessage(cause, 'Could not update this product.')); } finally { setBusyId(null); }
  }

  return <>
    <PageHeader title="Products" description="Moderate every vendor’s catalog. Unpublishing hides a product from all storefronts." />
    <ListCard list={list} empty={{ icon: <Boxes />, title: 'No products yet', text: 'Vendor products will appear here.' }}
      toolbar={<><Chips options={PSTATUS} value={status} onChange={setStatus} label="Filter by status" format={titleCase} /><span style={{ flex: 1 }} /><SearchBox value={q} onChange={setQ} placeholder="Search this page…" /></>}>
      {rows => <table><thead><tr><th>Product</th><th>Vendor</th><th>Type</th><th>Price</th><th>Status</th><th /></tr></thead><tbody>
        {rows.filter(p => (status === 'all' || p.status === status) && matches(q, p.name, p.vendor?.name)).map(p => <tr key={p.id}>
          <td><b>{p.name}</b>{p.is_featured && <> <Badge tone="info">Featured</Badge></>}</td><td>{p.vendor?.name ?? '—'}</td><td>{p.type === 'print' ? 'Printing' : 'Supplies'}</td><td>{money(Number(p.price), p.currency)}</td>
          <td><Badge tone={statusTone(p.status)}>{titleCase(p.status)}</Badge></td>
          <td><div className="vp-row-actions">
            <button className="btn sm" disabled={busyId === p.id} onClick={() => void patch(p, { is_featured: !p.is_featured }, p.is_featured ? 'Removed from featured.' : 'Marked as featured.')}>{p.is_featured ? 'Unfeature' : 'Feature'}</button>
            {p.status === 'published' ? <button className="btn sm danger" disabled={busyId === p.id} onClick={() => void patch(p, { status: 'draft' }, 'Product unpublished.')}>{busyId === p.id ? <Spinner /> : 'Unpublish'}</button>
              : <button className="btn sm primary" disabled={busyId === p.id} onClick={() => void patch(p, { status: 'published' }, 'Product published.')}>{busyId === p.id ? <Spinner /> : 'Publish'}</button>}
          </div></td></tr>)}
      </tbody></table>}
    </ListCard>
  </>;
}

/* ---------------------------- categories ---------------------------- */
type Category = { id: number; name: string; slug: string; description?: string | null; is_active: boolean; products_count?: number; vendor_id?: number | null };
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);

export function AdminCategories() {
  const toast = useToast();
  const list = usePaged<Category>('/v1/admin/categories');
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const name = String(f.get('name') ?? '').trim();
    const description = String(f.get('description') ?? '').trim() || null;
    if (!name) return setErrors({ name: 'Enter a category name.' });
    setBusy(true); setErrors({});
    try {
      if (editing === 'new') await apiFetch('/v1/admin/categories', { method: 'POST', body: JSON.stringify({ name, slug: slugify(name), description }) });
      else if (editing) await apiFetch(`/v1/admin/categories/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ name, description }) });
      toast.success(editing === 'new' ? 'Category created.' : 'Category saved.'); setEditing(null); await list.reload();
    } catch (cause) { setErrors({ name: friendlyMessage(cause, 'Could not save this category.') }); } finally { setBusy(false); }
  }
  async function toggle(c: Category) {
    try { await apiFetch(`/v1/admin/categories/${c.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !c.is_active }) }); toast.success(c.is_active ? 'Category deactivated.' : 'Category activated.'); await list.reload(); }
    catch (cause) { toast.error(friendlyMessage(cause, 'Could not update this category.')); }
  }
  const current = editing && editing !== 'new' ? editing : null;

  return <>
    <PageHeader title="Categories" description="Platform categories that vendors choose from when they apply and list products." actions={<button className="btn primary" onClick={() => { setErrors({}); setEditing('new'); }}>Add category</button>} />
    <ListCard list={list} empty={{ icon: <Tags />, title: 'No categories yet', text: 'Create the first platform category.' }}>
      {rows => <table><thead><tr><th>Name</th><th>Slug</th><th>Products</th><th>Scope</th><th>Status</th><th /></tr></thead><tbody>
        {rows.map(c => <tr key={c.id}><td><b>{c.name}</b>{c.description && <><br /><span className="muted" style={{ fontSize: 12 }}>{c.description}</span></>}</td><td><code>{c.slug}</code></td><td>{c.products_count ?? 0}</td>
          <td>{c.vendor_id ? 'Vendor' : 'Platform'}</td><td><Badge tone={c.is_active ? 'ok' : ''}>{c.is_active ? 'Active' : 'Inactive'}</Badge></td>
          <td><div className="vp-row-actions"><button className="btn sm" onClick={() => { setErrors({}); setEditing(c); }}>Edit</button><button className="btn sm" onClick={() => void toggle(c)}>{c.is_active ? 'Deactivate' : 'Activate'}</button></div></td></tr>)}
      </tbody></table>}
    </ListCard>
    <Drawer open={!!editing} title={editing === 'new' ? 'New category' : 'Edit category'} onClose={() => setEditing(null)}
      footer={<><button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button><button form="cat-form" className="btn primary" disabled={busy}>{busy ? <><Spinner />Saving…</> : 'Save category'}</button></>}>
      <form id="cat-form" key={current?.id ?? 'new'} onSubmit={save} className="stack" style={{ display: 'grid', gap: 16 }} noValidate>
        <div className={`form-field${errors.name ? ' has-error' : ''}`}><label htmlFor="cat-name">Name</label><input id="cat-name" name="name" defaultValue={current?.name ?? ''} maxLength={120} required />{errors.name && <small className="field-error">{errors.name}</small>}</div>
        <div className="form-field"><label htmlFor="cat-desc">Description</label><textarea id="cat-desc" name="description" defaultValue={current?.description ?? ''} maxLength={2000} /></div>
        {current && <p className="muted" style={{ fontSize: 12.5 }}>The address (<code>{current.slug}</code>) is fixed once a category is created.</p>}
      </form>
    </Drawer>
  </>;
}

/* ------------------------------ orders ------------------------------ */
type Order = { id: number; number: string; status: string; payment_status: string; total: string; currency: string; created_at: string; items_count?: number; customer?: { name: string; email: string } | null };
const OSTATUS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

export function AdminOrders() {
  const list = usePaged<Order>('/v1/admin/orders');
  const [status, setStatus] = useState<(typeof OSTATUS)[number]>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Order | null>(null);
  const shown = useMemo(() => (list.rows ?? []).filter(o => (status === 'all' || o.status === status) && matches(q, o.number, o.customer?.name, o.customer?.email)), [list.rows, status, q]);

  return <>
    <PageHeader title="Orders" description="All marketplace orders, newest first. Fulfilment is handled by each vendor." />
    <ListCard list={list} empty={{ icon: <Receipt />, title: 'No orders yet', text: 'Orders from customers and schools will appear here.' }}
      toolbar={<><Chips options={OSTATUS} value={status} onChange={setStatus} label="Filter by status" format={titleCase} /><span style={{ flex: 1 }} /><SearchBox value={q} onChange={setQ} placeholder="Search this page…" /></>}>
      {() => shown.length === 0 ? <Empty icon={<Receipt />} title="No matching orders" /> : <table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th /></tr></thead><tbody>
        {shown.map(o => <tr key={o.id}><td><b>{o.number}</b><br /><span className="muted" style={{ fontSize: 12 }}>{fmtDate(o.created_at)}</span></td><td>{o.customer?.name ?? '—'}</td><td>{o.items_count ?? 0}</td><td><b>{money(Number(o.total), o.currency)}</b></td>
          <td><Badge tone={o.payment_status === 'paid' ? 'ok' : 'warn'}>{titleCase(o.payment_status)}</Badge></td><td><Badge tone={statusTone(o.status)}>{titleCase(o.status)}</Badge></td>
          <td><div className="vp-row-actions"><button className="btn sm" onClick={() => setOpen(o)}>Details</button></div></td></tr>)}
      </tbody></table>}
    </ListCard>
    <Drawer open={!!open} title={open ? `Order ${open.number}` : ''} onClose={() => setOpen(null)}>
      {open && <dl className="vp-kv">
        <dt>Customer</dt><dd>{open.customer?.name ?? '—'}<br /><span className="muted">{open.customer?.email}</span></dd><dt>Placed</dt><dd>{fmtDate(open.created_at)}</dd>
        <dt>Items</dt><dd>{open.items_count ?? 0}</dd><dt>Total</dt><dd><b>{money(Number(open.total), open.currency)}</b></dd>
        <dt>Payment</dt><dd><Badge tone={open.payment_status === 'paid' ? 'ok' : 'warn'}>{titleCase(open.payment_status)}</Badge></dd><dt>Status</dt><dd><Badge tone={statusTone(open.status)}>{titleCase(open.status)}</Badge></dd>
      </dl>}
    </Drawer>
  </>;
}

/* ------------------------------ domains ------------------------------ */
type DomainRow = { id: number; hostname: string; is_verified: boolean; provisioning_status: string; is_primary: boolean; vendor?: { name: string; slug: string } | null };

export function AdminDomains() {
  const toast = useToast();
  const list = usePaged<DomainRow>('/v1/admin/domains');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ d: DomainRow; kind: 'activate' | 'verify' | 'unverify' } | null>(null);

  async function run() {
    if (!confirm) return;
    const { d, kind } = confirm;
    setBusyId(d.id);
    try {
      if (kind === 'activate') await apiFetch(`/v1/admin/domains/${d.id}/activate`, { method: 'POST', body: JSON.stringify({ dns_configured: true }) });
      else await apiFetch(`/v1/admin/domains/${d.id}`, { method: 'PATCH', body: JSON.stringify({ is_verified: kind === 'verify' }) });
      toast.success(kind === 'activate' ? `${d.hostname} is active.` : kind === 'verify' ? `${d.hostname} marked verified.` : `${d.hostname} marked unverified.`);
      setConfirm(null); await list.reload();
    } catch (cause) { toast.error(friendlyMessage(cause, 'Could not update this domain.')); } finally { setBusyId(null); }
  }

  return <>
    <PageHeader title="Domains" description="Storefront hostnames. A domain serves its store only when it is verified and active." />
    <ListCard list={list} empty={{ icon: <Globe />, title: 'No domains yet', text: 'Domains are created when a vendor is approved.' }} toolbar={<><span style={{ flex: 1 }} /><SearchBox value={q} onChange={setQ} placeholder="Search this page…" /></>}>
      {rows => <table><thead><tr><th>Hostname</th><th>Vendor</th><th>Verified</th><th>Provisioning</th><th /></tr></thead><tbody>
        {rows.filter(d => matches(q, d.hostname, d.vendor?.name)).map(d => <tr key={d.id}><td><b>{d.hostname}</b>{d.is_primary && <> <Badge tone="info">Primary</Badge></>}</td><td>{d.vendor?.name ?? '—'}</td>
          <td><Badge tone={d.is_verified ? 'ok' : 'warn'}>{d.is_verified ? 'Verified' : 'Unverified'}</Badge></td><td><Badge tone={d.provisioning_status === 'active' ? 'ok' : 'warn'}>{titleCase(d.provisioning_status)}</Badge></td>
          <td><div className="vp-row-actions">{d.provisioning_status !== 'active' && <button className="btn sm primary" onClick={() => setConfirm({ d, kind: 'activate' })}>Activate</button>}
            <button className="btn sm" onClick={() => setConfirm({ d, kind: d.is_verified ? 'unverify' : 'verify' })}>{d.is_verified ? 'Unverify' : 'Verify'}</button></div></td></tr>)}
      </tbody></table>}
    </ListCard>
    <ConfirmModal open={!!confirm} busy={busyId !== null} tone={confirm?.kind === 'unverify' ? 'danger' : 'primary'}
      title={confirm?.kind === 'activate' ? 'Activate domain mapping?' : confirm?.kind === 'verify' ? 'Mark domain as verified?' : 'Mark domain as unverified?'}
      text={confirm ? (confirm.kind === 'activate' ? `Confirm DNS and hosting are already configured for ${confirm.d.hostname}.` : confirm.kind === 'verify' ? `${confirm.d.hostname} will be allowed to serve its store.` : `${confirm.d.hostname} will stop serving its store.`) : ''}
      confirmLabel={confirm?.kind === 'activate' ? 'Activate' : confirm?.kind === 'verify' ? 'Mark verified' : 'Mark unverified'} onConfirm={() => void run()} onCancel={() => setConfirm(null)} />
  </>;
}

/* --------------------------- subscriptions --------------------------- */
type Subscription = { id: number; plan: string; status: string; starts_at?: string | null; ends_at?: string | null; billing_provider?: string | null; vendor?: { name: string } | null };

export function AdminSubscriptions() {
  const list = usePaged<Subscription>('/v1/admin/subscriptions');
  return <>
    <PageHeader title="Subscriptions" description="Vendor plans and billing status (read-only)." />
    <ListCard list={list} empty={{ icon: <CreditCard />, title: 'No subscriptions yet', text: 'Vendor subscription records will appear here.' }}>
      {rows => <table><thead><tr><th>Vendor</th><th>Plan</th><th>Status</th><th>Starts</th><th>Ends</th><th>Billing</th></tr></thead><tbody>
        {rows.map(s => <tr key={s.id}><td><b>{s.vendor?.name ?? '—'}</b></td><td>{titleCase(s.plan)}</td><td><Badge tone={statusTone(s.status)}>{titleCase(s.status)}</Badge></td><td>{fmtDate(s.starts_at)}</td><td>{fmtDate(s.ends_at)}</td><td>{s.billing_provider ?? '—'}</td></tr>)}
      </tbody></table>}
    </ListCard>
  </>;
}
