'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Building2, ClipboardCheck, Receipt, Boxes, TrendingUp, Users } from 'lucide-react';
import { apiFetch, type ApiData, type ApiPage } from '@/lib/api';
import { money } from '@/lib/data';
import { friendlyMessage } from '@/lib/errors';
import { Badge, Banner, Card, Empty, PageHeader, Skeleton, Stat, fmtDate, statusTone, titleCase } from '@/components/portal/ui';
import { useAdminSession } from './shell';

type Overview = { vendors: number; customers: number; products: number; orders: number; revenue: string | number };
type Pending = { id: number; name: string; email: string; created_at: string; owner?: { name: string }; category?: { name: string } };
type OrderRow = { id: number; number: string; status: string; payment_status: string; total: string; currency: string; created_at: string; customer?: { name: string } };

const SEGMENTS = [['active', 'Approved', '#067647'], ['pending', 'Pending', '#b45309'], ['suspended', 'Suspended', '#b42318'], ['rejected', 'Rejected', '#667085']] as const;

export function AdminOverview() {
  const session = useAdminSession();
  const [stats, setStats] = useState<Overview | null>(null);
  const [pending, setPending] = useState<Pending[] | null>(null);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [split, setSplit] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<ApiData<Overview>>('/v1/admin/overview').then(r => setStats(r.data)).catch(c => setError(friendlyMessage(c, 'Could not load platform statistics.')));
    apiFetch<ApiPage<Pending>>('/v1/admin/vendor-requests?status=pending').then(r => setPending(r.data.slice(0, 5))).catch(() => setPending([]));
    apiFetch<ApiPage<OrderRow>>('/v1/admin/orders').then(r => setOrders(r.data.slice(0, 6))).catch(() => setOrders([]));
    // Real per-status totals come from each filtered list's pagination meta.
    void Promise.all(SEGMENTS.map(([key]) => apiFetch<ApiPage<unknown>>(`/v1/admin/vendor-requests?status=${key}`).then(r => [key, r.meta.total] as const).catch(() => [key, 0] as const)))
      .then(rows => setSplit(Object.fromEntries(rows)));
  }, []);

  const total = split ? Object.values(split).reduce((a, b) => a + b, 0) : 0;
  return <>
    <PageHeader title={`Welcome back, ${session?.user.name.split(' ')[0] ?? 'admin'}`} description="A live view of the whole marketplace."
      actions={<Link className="btn primary" href="/admin/vendors/requests"><ClipboardCheck size={15} />Review applications</Link>} />
    {error && <Banner tone="bad">{error}</Banner>}

    <div className="vp-stats">
      {!stats ? [0, 1, 2, 3].map(i => <div key={i} className="vp-stat"><Skeleton h={40} w={40} /><div style={{ flex: 1 }}><Skeleton h={12} w="60%" /><div style={{ height: 8 }} /><Skeleton h={22} w="40%" /></div></div>) : <>
        <Stat label="Vendors" value={stats.vendors} icon={<Building2 size={19} />} hint="all statuses" />
        <Stat label="Customers" value={stats.customers} icon={<Users size={19} />} tone="info" hint="customer accounts" />
        <Stat label="Products" value={stats.products} icon={<Boxes size={19} />} hint="across all vendors" />
        <Stat label="Revenue" value={money(Number(stats.revenue), 'PKR')} icon={<TrendingUp size={19} />} tone="ok" hint={`${stats.orders} order${stats.orders === 1 ? "" : "s"} · paid only`} />
      </>}
    </div>

    <div className="vp-cols">
      <div>
        <Card title="Needs review" description="Vendor applications waiting for a decision." flush actions={<Link className="btn sm" href="/admin/vendors/requests">Open queue<ArrowRight size={14} /></Link>}>
          {pending === null ? <div style={{ padding: 20 }}><Skeleton h={18} /></div> : pending.length === 0 ? <Empty icon={<ClipboardCheck />} title="Nothing to review" text="New vendor applications will appear here." /> :
            <div className="table-scroll"><table><thead><tr><th>Store</th><th>Owner</th><th>Category</th><th>Applied</th></tr></thead><tbody>{pending.map(v => <tr key={v.id}>
              <td><b>{v.name}</b><br /><span className="muted" style={{ fontSize: 12 }}>{v.email}</span></td><td>{v.owner?.name ?? '—'}</td><td>{v.category?.name ?? '—'}</td><td>{fmtDate(v.created_at)}</td></tr>)}</tbody></table></div>}
        </Card>
        <Card title="Latest orders" flush actions={<Link className="btn sm" href="/admin/orders">View all<ArrowRight size={14} /></Link>}>
          {orders === null ? <div style={{ padding: 20 }}><Skeleton h={18} /></div> : orders.length === 0 ? <Empty icon={<Receipt />} title="No orders yet" /> :
            <div className="table-scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}>
              <td><b>{o.number}</b><br /><span className="muted" style={{ fontSize: 12 }}>{fmtDate(o.created_at)}</span></td><td>{o.customer?.name ?? '—'}</td><td>{money(Number(o.total), o.currency)}</td>
              <td><Badge tone={statusTone(o.status)}>{titleCase(o.status)}</Badge></td></tr>)}</tbody></table></div>}
        </Card>
      </div>
      <Card title="Vendors by status" description={split ? `${total} vendor${total === 1 ? '' : 's'} on the platform` : undefined}>
        {!split ? <Skeleton h={10} /> : total === 0 ? <p className="muted">No vendors yet.</p> : <>
          <div className="vp-split" role="img" aria-label="Vendors by status">{SEGMENTS.map(([key, , color]) => split[key] ? <i key={key} style={{ width: `${(split[key] / total) * 100}%`, background: color }} /> : null)}</div>
          <div className="vp-legend">{SEGMENTS.map(([key, label, color]) => <span key={key}><i style={{ background: color }} />{label} <em>{split[key] ?? 0}</em></span>)}</div>
        </>}
      </Card>
    </div>
  </>;
}
