'use client';

import Link from '@/components/store-link';
import { useEffect, useState } from 'react';
import { ArrowRight, Clock, Package, Printer, Receipt, Wallet } from 'lucide-react';
import { apiFetch, type ApiPage } from '@/lib/api';
import { money } from '@/lib/data';
import { friendlyMessage } from '@/lib/errors';
import { Badge, Banner, Card, Empty, PageHeader, Skeleton, Stat, fmtDate, statusTone, titleCase } from '@/components/portal/ui';
import { useSchoolSession } from './shell';
import { deliveryStatus, type SchoolOrder } from './orders';

export function SchoolDashboard() {
  const session = useSchoolSession();
  const [orders, setOrders] = useState<SchoolOrder[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => { apiFetch<ApiPage<SchoolOrder>>('/v1/school/orders').then(r => { setOrders(r.data); setTotal(r.meta.total); }).catch(c => { setError(friendlyMessage(c, 'Could not load your orders.')); setOrders([]); }); }, []);
  if (!session) return null;
  const { school, store } = session;
  const open = orders?.filter(o => ['pending', 'processing', 'shipped'].includes(deliveryStatus(o))).length ?? 0;
  const spend = orders?.filter(o => deliveryStatus(o) !== 'cancelled').reduce((n, o) => n + Number(o.total), 0) ?? 0;

  return <>
    <PageHeader title={school.name} description={store ? `Ordering from ${store.name}.` : 'Your school ordering workspace.'} actions={<><Link className="btn" href="/school/orders">My orders</Link><Link className="btn primary" href="/school/catalog">Start an order</Link></>} />
    {error && <Banner tone="bad">{error}</Banner>}
    <div className="vp-stats">
      {orders === null ? [0, 1, 2].map(i => <div key={i} className="vp-stat"><Skeleton h={40} w={40} /><div style={{ flex: 1 }}><Skeleton h={12} w="60%" /><div style={{ height: 8 }} /><Skeleton h={22} w="40%" /></div></div>) : <>
        <Stat label="Orders placed" value={total} icon={<Receipt size={19} />} hint="all time" />
        <Stat label="In progress" value={open} icon={<Clock size={19} />} tone={open ? 'warn' : 'ok'} hint="among your latest orders" />
        <Stat label="Recent spend" value={money(spend, 'PKR')} icon={<Wallet size={19} />} tone="info" hint="latest orders, excl. cancelled" />
      </>}
    </div>
    <div className="vp-cols">
      <Card title="Recent orders" flush actions={<Link className="btn sm" href="/school/orders">View all<ArrowRight size={14} /></Link>}>
        {orders === null ? <div style={{ padding: 20 }}><Skeleton h={18} /></div> : orders.length === 0 ? <Empty icon={<Receipt />} title="No orders yet" text="Place your first order from the catalog." action={<Link className="btn primary" href="/school/catalog">Browse catalog</Link>} /> :
          <div className="table-scroll"><table><thead><tr><th>Order</th><th>Items</th><th>Total</th><th>Delivery</th></tr></thead><tbody>{orders.slice(0, 5).map(o => <tr key={o.id}>
            <td><Link href={`/school/orders/${o.id}`}><b>{o.number}</b></Link><br /><span className="muted" style={{ fontSize: 12 }}>{fmtDate(o.created_at)}</span></td>
            <td style={{ maxWidth: 240 }}>{o.items.map(i => `${i.product_name} × ${i.quantity}`).join(', ')}</td><td>{money(Number(o.total), o.currency)}</td>
            <td><Badge tone={statusTone(deliveryStatus(o))}>{titleCase(deliveryStatus(o))}</Badge></td></tr>)}</tbody></table></div>}
      </Card>
      <Card title="Order something">
        <div className="vp-quick">
          <Link href="/school/catalog"><Package size={18} />School supplies</Link>
          <Link href="/school/catalog"><Printer size={18} />Printing services</Link>
        </div>
      </Card>
    </div>
  </>;
}
