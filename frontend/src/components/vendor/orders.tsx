'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Receipt } from 'lucide-react';
import { apiFetch, type ApiPage } from '@/lib/api';
import { money } from '@/lib/data';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/toast';
import { useVendorSession } from '@/components/vendor-shell';
import { Badge, Banner, Card, Drawer, Empty, PageHeader, Spinner, TableSkeleton, statusTone, titleCase } from './ui';

type Item = { id: number; product_name: string; quantity: number; unit_price: string; line_total: string; status: string };
type Order = { id: number; number: string; status: string; created_at: string; customer?: { name: string; email?: string; school?: { name: string } | null }; items?: Item[] };
type Meta = ApiPage<Order>['meta'];

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const FLOW = ['processing', 'shipped', 'delivered'];
const itemStatus = (o: Order) => o.items?.[0]?.status ?? o.status;
const total = (o: Order) => (o.items ?? []).reduce((sum, i) => sum + Number(i.line_total), 0);

export function VendorOrders() {
  const session = useVendorSession();
  const toast = useToast();
  const vendor = session?.vendor;
  const canEdit = vendor?.status === 'active';
  const [rows, setRows] = useState<Order[] | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!vendor) return;
    try {
      const res = await apiFetch<ApiPage<Order>>(`/v1/vendor/${vendor.slug}/orders?page=${page}`);
      setRows(res.data); setMeta(res.meta); setError('');
    } catch (cause) { setError(vendor.status !== 'active' ? 'Orders appear here once your store is approved.' : friendlyMessage(cause, 'Could not load your orders.')); setRows([]); }
  }, [vendor, page]);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => (rows ?? []).filter(o => filter === 'all' || itemStatus(o) === filter), [rows, filter]);
  const open = rows?.find(o => o.id === openId) ?? null;

  async function setStatus(order: Order, status: string) {
    if (!vendor) return;
    setBusy(true);
    try {
      await apiFetch(`/v1/vendor/${vendor.slug}/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      toast.success(`Order ${order.number} marked as ${status}.`); await load();
    } catch (cause) { toast.error(friendlyMessage(cause, 'Could not update the order.')); } finally { setBusy(false); }
  }

  return <>
    <PageHeader title="Orders" description="Orders that include your products. Move them along as you fulfil them." />
    {error && <Banner tone={vendor?.status === 'active' ? 'bad' : 'info'}>{error}</Banner>}
    <Card flush>
      <div className="vp-toolbar"><div className="vp-chips" role="group" aria-label="Filter orders">{['all', ...STATUSES].map(s => <button key={s} className={`vp-chip${filter === s ? ' on' : ''}`} onClick={() => setFilter(s)}>{titleCase(s)}</button>)}</div></div>
      {rows === null ? <TableSkeleton /> : rows.length === 0 ? <Empty icon={<Receipt />} title="No orders yet" text="When customers buy your products, their orders will show up here." />
        : visible.length === 0 ? <Empty icon={<Receipt />} title={`No ${filter} orders`} />
        : <div className="table-scroll"><table>
          <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th /></tr></thead>
          <tbody>{visible.map(o => <tr key={o.id}>
            <td><b>{o.number}</b><br /><span className="muted" style={{ fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString()}</span></td>
            <td>{o.customer?.name ?? '—'}{o.customer?.school?.name && <><br /><span className="muted" style={{ fontSize: 12 }}>{o.customer.school.name}</span></>}</td>
            <td style={{ maxWidth: 260 }}>{o.items?.map(i => `${i.product_name} × ${i.quantity}`).join(', ')}</td>
            <td><b>{money(total(o), 'PKR')}</b></td>
            <td><Badge tone={statusTone(itemStatus(o))}>{titleCase(itemStatus(o))}</Badge></td>
            <td><div className="vp-row-actions"><button className="btn sm" onClick={() => setOpenId(o.id)}>Manage</button></div></td>
          </tr>)}</tbody>
        </table></div>}
      {meta && meta.last_page > 1 && <div className="vp-pager"><span>Page {meta.current_page} of {meta.last_page}</span><div style={{ display: 'flex', gap: 8 }}><button className="btn sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><button className="btn sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>Next</button></div></div>}
    </Card>

    <Drawer open={!!open} title={open ? `Order ${open.number}` : ''} onClose={() => setOpenId(null)}>
      {open && <>
        <dl className="vp-kv" style={{ marginBottom: 22 }}>
          <dt>Customer</dt><dd>{open.customer?.name}{open.customer?.email && <><br /><span className="muted">{open.customer.email}</span></>}</dd>
          {open.customer?.school?.name && <><dt>School</dt><dd>{open.customer.school.name}</dd></>}
          <dt>Placed</dt><dd>{new Date(open.created_at).toLocaleString()}</dd>
          <dt>Your status</dt><dd><Badge tone={statusTone(itemStatus(open))}>{titleCase(itemStatus(open))}</Badge></dd>
        </dl>
        <h4 style={{ marginBottom: 6 }}>Your items</h4>
        <div style={{ marginBottom: 22 }}>{open.items?.map(i => <div className="vp-item" key={i.id}><span>{i.product_name} <span className="muted">× {i.quantity}</span></span><b>{money(Number(i.line_total), 'PKR')}</b></div>)}
          <div className="vp-item"><span>Total for your store</span><b>{money(total(open), 'PKR')}</b></div></div>
        {canEdit ? <>
          <h4 style={{ marginBottom: 10 }}>Update status</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FLOW.map(s => <button key={s} className={`btn${itemStatus(open) === s ? ' primary' : ''}`} disabled={busy || itemStatus(open) === s} onClick={() => void setStatus(open, s)}>{busy && itemStatus(open) !== s ? <Spinner /> : null}{titleCase(s)}</button>)}
            <button className="btn danger" disabled={busy || itemStatus(open) === 'cancelled'} onClick={() => void setStatus(open, 'cancelled')}>Cancel order</button>
          </div></> : <Banner tone="info">Status changes unlock once your store is approved.</Banner>}
      </>}
    </Drawer>
  </>;
}
