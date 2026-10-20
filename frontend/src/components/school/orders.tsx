'use client';

import Link from '@/components/store-link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Receipt } from 'lucide-react';
import { apiFetch, type ApiData } from '@/lib/api';
import { money } from '@/lib/data';
import { friendlyMessage } from '@/lib/errors';
import { usePaged } from '@/lib/use-paged';
import { Badge, Banner, Card, Chips, Empty, PageHeader, Pager, Skeleton, TableSkeleton, fmtDate, fmtDateTime, statusTone, titleCase } from '@/components/portal/ui';

export type OrderItem = { id: number; product_name: string; quantity: number; unit_price: string; line_total: string; status: string };
export type SchoolOrder = {
  id: number; number: string; status: string; payment_status: string; total: string; currency: string; created_at: string; items: OrderItem[];
  shipping_address?: { recipient?: string; phone?: string | null; line1?: string; line2?: string | null; city?: string; region?: string | null; postal_code?: string | null; country?: string } | null;
};

const FLOW = ['pending', 'processing', 'shipped', 'delivered'] as const;

/** The vendor updates each line item; the order itself is shown as its least-advanced live item. */
export function deliveryStatus(order: Pick<SchoolOrder, 'status' | 'items'>): string {
  const states = order.items.map(i => i.status);
  if (states.length === 0) return order.status;
  if (states.every(s => s === 'cancelled')) return 'cancelled';
  const live = states.filter(s => s !== 'cancelled');
  return live.reduce((low, s) => FLOW.indexOf(s as (typeof FLOW)[number]) < FLOW.indexOf(low as (typeof FLOW)[number]) ? s : low, live[0]);
}

const FILTERS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

export function SchoolOrders() {
  const list = usePaged<SchoolOrder>('/v1/school/orders');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const shown = useMemo(() => (list.rows ?? []).filter(o => filter === 'all' || deliveryStatus(o) === filter), [list.rows, filter]);

  return <>
    <PageHeader title="My orders" description="Everything your school has ordered, with live delivery status." actions={<Link className="btn primary" href="/school/catalog">New order</Link>} />
    <Card flush>
      <div className="vp-toolbar"><Chips options={FILTERS} value={filter} onChange={setFilter} label="Filter by status" format={titleCase} /></div>
      {list.error && <div style={{ padding: 18 }}><Banner tone="bad">{list.error}</Banner></div>}
      {list.rows === null ? <TableSkeleton /> : list.rows.length === 0 ? <Empty icon={<Receipt />} title="No orders yet" text="Orders you place will be tracked here." action={<Link className="btn primary" href="/school/catalog">Browse catalog</Link>} />
        : shown.length === 0 ? <Empty icon={<Receipt />} title={`No ${filter} orders`} />
        : <div className="table-scroll"><table><thead><tr><th>Order</th><th>Items</th><th>Total</th><th>Payment</th><th>Delivery</th><th /></tr></thead><tbody>{shown.map(o => <tr key={o.id}>
          <td><b>{o.number}</b><br /><span className="muted" style={{ fontSize: 12 }}>{fmtDate(o.created_at)}</span></td>
          <td style={{ maxWidth: 280 }}>{o.items.map(i => `${i.product_name} × ${i.quantity}`).join(', ')}</td><td><b>{money(Number(o.total), o.currency)}</b></td>
          <td><Badge tone={o.payment_status === 'paid' ? 'ok' : 'warn'}>{titleCase(o.payment_status)}</Badge></td><td><Badge tone={statusTone(deliveryStatus(o))}>{titleCase(deliveryStatus(o))}</Badge></td>
          <td><div className="vp-row-actions"><Link className="btn sm" href={`/school/orders/${o.id}`}>View</Link></div></td></tr>)}</tbody></table></div>}
      <Pager meta={list.meta} page={list.page} onPage={list.setPage} />
    </Card>
  </>;
}

export function SchoolOrderDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<SchoolOrder | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiFetch<ApiData<SchoolOrder>>(`/v1/school/orders/${encodeURIComponent(id)}`).then(r => setOrder(r.data)).catch(c => setError(friendlyMessage(c, 'We couldn’t load this order.'))); }, [id]);

  if (error) return <><Link className="btn sm" href="/school/orders"><ArrowLeft size={14} />All orders</Link><div style={{ height: 16 }} /><Banner tone="bad" title="Order unavailable">{error}</Banner></>;
  if (!order) return <><Skeleton h={28} w="30%" /><div style={{ height: 16 }} /><Skeleton h={120} /></>;

  const status = deliveryStatus(order);
  const stepIndex = FLOW.indexOf(status as (typeof FLOW)[number]);
  const a = order.shipping_address;
  return <>
    <PageHeader title={`Order ${order.number}`} description={`Placed ${fmtDateTime(order.created_at)}`} actions={<Link className="btn" href="/school/orders"><ArrowLeft size={14} />All orders</Link>} />
    <Card title="Delivery progress" actions={<Badge tone={statusTone(status)}>{titleCase(status)}</Badge>}>
      {status === 'cancelled' ? <p className="muted">This order was cancelled by the store.</p> : <ol className={`vp-steps`}>{FLOW.map((s, i) => <li key={s} className={i < stepIndex ? 'done' : i === stepIndex ? (status === 'delivered' ? 'done' : 'now') : ''}>{s === 'pending' ? 'Placed' : titleCase(s)}</li>)}</ol>}
    </Card>
    <div className="vp-cols">
      <Card title="Items" flush><div className="table-scroll"><table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Total</th><th>Status</th></tr></thead><tbody>{order.items.map(i => <tr key={i.id}>
        <td><b>{i.product_name}</b></td><td>{i.quantity}</td><td>{money(Number(i.unit_price), order.currency)}</td><td>{money(Number(i.line_total), order.currency)}</td><td><Badge tone={statusTone(i.status)}>{titleCase(i.status)}</Badge></td></tr>)}</tbody></table></div>
        <div className="vp-item" style={{ padding: '14px 18px' }}><span>Order total</span><b>{money(Number(order.total), order.currency)}</b></div></Card>
      <div>
        <Card title="Payment"><div className="vp-item"><span className="muted">Status</span><Badge tone={order.payment_status === 'paid' ? 'ok' : 'warn'}>{titleCase(order.payment_status)}</Badge></div><p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Your store confirms payment directly with your school.</p></Card>
        <Card title="Delivering to">{a ? <address style={{ fontStyle: 'normal', lineHeight: 1.7 }}><b>{a.recipient}</b><br />{a.line1}{a.line2 && <><br />{a.line2}</>}<br />{[a.city, a.region, a.postal_code].filter(Boolean).join(', ')}{a.phone && <><br />{a.phone}</>}</address> : <p className="muted">No address on file.</p>}</Card>
      </div>
    </div>
  </>;
}
