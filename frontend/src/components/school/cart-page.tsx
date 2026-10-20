'use client';

import Link from '@/components/store-link';
import { useStoreRouter as useRouter } from '@/components/store-link';
import { useState } from 'react';
import { ImageIcon, Package, Trash2 } from 'lucide-react';
import { ApiError, apiFetch, type ApiData } from '@/lib/api';
import { money } from '@/lib/data';
import { fieldErrors, friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/toast';
import { Field } from '@/components/form-ui';
import { Banner, Card, Empty, PageHeader, Spinner, clearErrorOnInput } from '@/components/portal/ui';
import { useSchoolSession } from './shell';
import { useSchoolCart } from './cart';

export function SchoolCartPage() {
  const router = useRouter();
  const toast = useToast();
  const session = useSchoolSession();
  const cart = useSchoolCart();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  if (!session) return null;
  const { school } = session;

  async function place(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const text = (k: string) => String(f.get(k) ?? '').trim();
    const problems: Record<string, string> = {};
    if (!text('recipient')) problems.recipient = 'Enter who will receive the delivery.';
    if (!text('line1')) problems.line1 = 'Enter the delivery address.';
    if (!text('city')) problems.city = 'Enter the city.';
    if (Object.keys(problems).length) return setErrors(problems);
    setBusy(true); setErrors({}); setFormError('');
    try {
      const res = await apiFetch<ApiData<{ id: number; number: string }>>('/v1/school/orders', { method: 'POST', body: JSON.stringify({
        items: cart.lines.map(l => ({ product_id: l.id, quantity: l.qty })),
        shipping_address: { recipient: text('recipient'), phone: text('phone') || null, line1: text('line1'), line2: text('line2') || null, city: text('city'), region: text('region') || null, postal_code: text('postal_code') || null, country: 'PK' },
      }) });
      cart.clear();
      toast.success(`Order ${res.data.number} placed.`);
      router.push(`/school/orders/${res.data.id}`);
    } catch (cause) {
      // Laravel field names are nested (shipping_address.city); strip the prefix so they map onto this form.
      const mapped: Record<string, string> = {};
      for (const [k, v] of Object.entries(cause instanceof ApiError ? fieldErrors(cause) : {})) mapped[k.replace('shipping_address.', '')] = v;
      const stock = Object.keys(mapped).length === 0;
      setErrors(mapped);
      setFormError(stock ? friendlyMessage(cause, 'We couldn’t place your order.') : 'Please check the highlighted fields.');
    } finally { setBusy(false); }
  }

  return <>
    <PageHeader title="Order basket" description="Review your items and confirm delivery details. Final prices and stock are confirmed when you place the order." />
    {cart.lines.length === 0 ? <Card><Empty icon={<Package />} title="Your basket is empty" text="Browse the catalog to add school supplies or printing services." action={<Link className="btn primary" href="/school/catalog">Browse catalog</Link>} /></Card> :
      <div className="vp-cols">
        <Card title={`Items (${cart.count})`} flush>
          <div className="table-scroll"><table><thead><tr><th>Item</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th /></tr></thead><tbody>{cart.lines.map(l => <tr key={l.id}>
            <td><div className="vp-cell"><span className="vp-thumb">{l.image ? <img src={l.image} alt="" /> : <ImageIcon size={18} />}</span><b>{l.name}</b></div></td>
            <td>{money(l.price, l.currency)}</td>
            <td><div className="vp-qty"><button type="button" aria-label={`Decrease ${l.name}`} disabled={l.qty <= 1} onClick={() => cart.setQty(l.id, l.qty - 1)}>−</button><input type="number" min={1} max={Math.min(l.max, 100)} value={l.qty} aria-label={`Quantity of ${l.name}`} onChange={e => cart.setQty(l.id, Number(e.target.value))} /><button type="button" aria-label={`Increase ${l.name}`} disabled={l.qty >= Math.min(l.max, 100)} onClick={() => cart.setQty(l.id, l.qty + 1)}>+</button></div></td>
            <td><b>{money(l.qty * l.price, l.currency)}</b></td>
            <td><div className="vp-row-actions"><button className="btn sm ghost" aria-label={`Remove ${l.name}`} onClick={() => cart.remove(l.id)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>
        </Card>
        <Card title="Delivery & checkout">
          <form onSubmit={place} onInput={clearErrorOnInput(setErrors)} style={{ display: 'grid', gap: 14 }} noValidate>
            {formError && <Banner tone="bad">{formError}</Banner>}
            <Field label="Recipient" name="recipient" defaultValue={school.user.name} autoComplete="name" error={errors.recipient} />
            <Field label="Phone" name="phone" type="tel" defaultValue={school.phone ?? school.user.phone ?? ''} autoComplete="tel" error={errors.phone} />
            <Field label="Address" name="line1" defaultValue={school.address ?? ''} error={errors.line1} />
            <Field label="Address line 2 (optional)" name="line2" error={errors.line2} />
            <div className="form-grid">
              <Field label="City" name="city" autoComplete="address-level2" error={errors.city} />
              <Field label="Postal code" name="postal_code" error={errors.postal_code} />
            </div>
            <Field label="Province / region (optional)" name="region" error={errors.region} />
            <div className="vp-sum"><div className="row"><span>Subtotal</span><span>{money(cart.subtotal, 'PKR')}</span></div><div className="row"><span>Delivery</span><span>Arranged by your store</span></div><div className="row total"><span>Total</span><span>{money(cart.subtotal, 'PKR')}</span></div></div>
            <p className="muted" style={{ fontSize: 12.5 }}>Payment is not collected online. Your store confirms payment and delivery after the order is placed.</p>
            <button className="btn primary" disabled={busy} style={{ height: 46 }}>{busy ? <><Spinner />Placing order…</> : 'Place order'}</button>
          </form>
        </Card>
      </div>}
  </>;
}
