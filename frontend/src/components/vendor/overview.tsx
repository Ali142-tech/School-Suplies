'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, ExternalLink, FileText, Globe, Package, PackagePlus, Palette, Receipt, TrendingUp, TriangleAlert } from 'lucide-react';
import { apiFetch, type ApiData, type ApiPage } from '@/lib/api';
import { money } from '@/lib/data';
import { friendlyMessage } from '@/lib/errors';
import type { PageSummary } from '@/lib/cms';
import { useToast } from '@/components/toast';
import { useVendorSession } from '@/components/vendor-shell';
import { Badge, Banner, Card, Empty, PageHeader, Skeleton, Stat, Spinner, statusTone, titleCase } from './ui';

type Stats = { products: number; orders: number; low_stock: number; sales: number; domains: { id: number; hostname: string; is_verified: boolean; provisioning_status: string; is_primary: boolean }[] };
type OrderRow = { id: number; number: string; status: string; created_at: string; customer?: { name: string }; items?: { product_name: string; quantity: number; line_total: string; status: string }[] };

export function VendorOverview() {
  const session = useVendorSession();
  const toast = useToast();
  const vendor = session?.vendor;
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<number | null>(null);
  const [pages, setPages] = useState<PageSummary[] | null>(null);
  const [logo, setLogo] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [welcome, setWelcome] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setWelcome(new URLSearchParams(window.location.search).has('welcome')); }, []);
  useEffect(() => {
    if (!vendor) return;
    const base = `/v1/vendor/${vendor.slug}`;
    apiFetch<ApiData<Stats>>(`${base}/dashboard`).then(r => setStats(r.data)).catch(c => setError(friendlyMessage(c, 'Could not load your store statistics.')));
    apiFetch<ApiData<unknown[]>>(`${base}/categories`).then(r => setCategories(r.data.length)).catch(() => setCategories(0));
    apiFetch<ApiData<PageSummary[]>>(`${base}/pages`).then(r => setPages(r.data)).catch(() => setPages([]));
    apiFetch<ApiData<{ logo_url?: string | null }>>(`${base}/settings`).then(r => setLogo(!!r.data.logo_url)).catch(() => setLogo(false));
    apiFetch<ApiPage<OrderRow>>(`${base}/orders`).then(r => setOrders(r.data.slice(0, 5))).catch(() => setOrders([]));
  }, [vendor]);

  if (!vendor || !session) return null;
  const approved = vendor.status === 'active';
  const hasPublished = !!pages?.some(p => p.status === 'published');
  const steps = [
    { done: approved, title: 'Get your store approved', text: approved ? 'Your store is live on the platform.' : 'The team reviews new stores before they go live.', href: '/vendor/dashboard' },
    { done: (stats?.products ?? 0) > 0, title: 'Add your first product', text: 'List an item with a price, photo and stock level.', href: '/vendor/products/create' },
    { done: (categories ?? 0) > 0, title: 'Organise with categories', text: 'Group products so customers can browse easily.', href: '/vendor/categories' },
    { done: !!logo, title: 'Add your logo & brand colour', text: 'Make your storefront look like you.', href: '/vendor/website' },
    { done: hasPublished, title: 'Publish a website page', text: 'Tell your story with the page builder.', href: '/vendor/pages' },
  ];
  const doneCount = steps.filter(s => s.done).length;
  const domain = stats?.domains?.find(d => d.is_primary) ?? stats?.domains?.[0];

  return <>
    <PageHeader title={`Hello, ${session.user.name.split(' ')[0]} 👋`} description="Here’s what’s happening with your store today."
      actions={<><Link className="btn" href="/vendor/pages"><FileText size={15} />Edit website</Link><Link className="btn primary" href="/vendor/products/create"><PackagePlus size={15} />Add product</Link></>} />

    {welcome && <Banner tone="ok" title="Welcome aboard!">Your vendor account is ready. Follow the checklist below to set up your store.</Banner>}
    {vendor.status === 'rejected' && <Reapply slug={vendor.slug} initial={vendor.slug} reason={vendor.rejection_reason} onDone={() => { toast.success('Application resubmitted.'); void session.reload(); }} />}
    {error && <Banner tone="bad">{error}</Banner>}

    <div className="vp-stats">
      {!stats ? [0, 1, 2, 3].map(i => <div key={i} className="vp-stat"><Skeleton h={40} w={40} /><div style={{ flex: 1 }}><Skeleton h={12} w="60%" /><div style={{ height: 8 }} /><Skeleton h={22} w="40%" /></div></div>) : <>
        <Stat label="Products" value={stats.products} icon={<Package size={19} />} hint="in your catalog" />
        <Stat label="Orders" value={stats.orders} icon={<Receipt size={19} />} tone="info" hint="containing your items" />
        <Stat label="Low stock" value={stats.low_stock} icon={<TriangleAlert size={19} />} tone={stats.low_stock ? 'warn' : 'ok'} hint={stats.low_stock ? 'need restocking' : 'all healthy'} />
        <Stat label="Sales" value={money(Number(stats.sales), 'PKR')} icon={<TrendingUp size={19} />} tone="ok" hint="processing & fulfilled" />
      </>}
    </div>

    <div className="vp-cols">
      <div>
        <Card title="Recent orders" flush actions={<Link className="btn sm" href="/vendor/orders">View all<ArrowRight size={14} /></Link>}>
          {orders === null ? <div style={{ padding: 20 }}><Skeleton h={18} /></div> : orders.length === 0 ? <Empty icon={<Receipt />} title="No orders yet" text={approved ? 'Orders containing your products will show up here.' : 'Orders appear here once your store is approved and live.'} /> :
            <div className="table-scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Status</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}>
              <td><b>{o.number}</b><br /><span className="muted" style={{ fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString()}</span></td>
              <td>{o.customer?.name ?? '—'}</td>
              <td>{o.items?.map(i => `${i.product_name} × ${i.quantity}`).join(', ')}</td>
              <td><Badge tone={statusTone(o.items?.[0]?.status ?? o.status)}>{titleCase(o.items?.[0]?.status ?? o.status)}</Badge></td>
            </tr>)}</tbody></table></div>}
        </Card>

        {domain && <Card title="Your storefront" description="Where customers find you.">
          <div className="vp-item"><span><Globe size={15} style={{ verticalAlign: '-3px', marginRight: 6 }} /><b style={{ color: 'var(--vp-ink)' }}>{domain.hostname}</b></span><Badge tone={domain.is_verified ? 'ok' : 'warn'}>{domain.is_verified ? 'Live' : titleCase(domain.provisioning_status)}</Badge></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn sm" onClick={() => void navigator.clipboard.writeText(`https://${domain.hostname}`).then(() => toast.success('Storefront URL copied.')).catch(() => toast.error('Could not copy the URL.'))}>Copy URL</button>
            {approved && <Link className="btn sm" href={`/store/${vendor.slug}`} target="_blank"><ExternalLink size={13} />Preview</Link>}
          </div>
        </Card>}
      </div>

      <div>
        <Card title="Set up your store" description={`${doneCount} of ${steps.length} steps complete`} flush>
          <div style={{ padding: '0 22px 16px' }}><div className="vp-progress"><i style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div></div>
          <ul className="vp-todo">{steps.map(s => <li key={s.title} className={s.done ? 'done' : ''}><Link href={s.href}>
            <span className="tick">{s.done && <Check size={13} strokeWidth={3} />}</span>
            <span><b>{s.title}</b><span>{s.text}</span></span>
            {!s.done && <ArrowRight size={16} className="go" />}
          </Link></li>)}</ul>
        </Card>
        <Card title="Quick actions" flush>
          <div className="vp-quick">
            <Link href="/vendor/products/create"><PackagePlus size={18} />New product</Link>
            <Link href="/vendor/pages"><FileText size={18} />Website pages</Link>
            <Link href="/vendor/website"><Palette size={18} />Branding</Link>
            <Link href="/vendor/orders"><Receipt size={18} />Fulfil orders</Link>
          </div>
        </Card>
      </div>
    </div>
  </>;
}

function Reapply({ slug, initial, reason, onDone }: { slug: string; initial: string; reason?: string | null; onDone: () => void }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await apiFetch(`/v1/vendor/${slug}/reapply`, { method: 'POST', body: JSON.stringify({ store_slug: value }) }); onDone(); }
    catch (cause) { setError(friendlyMessage(cause, 'Could not resubmit your application.')); } finally { setBusy(false); }
  }
  return <Card title="Resubmit your application" description={reason || 'You can adjust your store address and ask for another review.'}>
    <form className="form-grid" onSubmit={submit}>
      <div className="form-field"><label htmlFor="re-slug">Store address</label><input id="re-slug" value={value} onChange={e => setValue(e.target.value.toLowerCase())} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={63} required /></div>
      <div className="form-field" style={{ justifyContent: 'flex-end' }}><button className="btn primary" disabled={busy}>{busy ? <><Spinner />Submitting…</> : 'Resubmit for review'}</button></div>
      {error && <div className="form-wide notice" role="alert">{error}</div>}
    </form>
  </Card>;
}
