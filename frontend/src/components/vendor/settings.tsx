'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Globe, Palette, Trash2 } from 'lucide-react';
import { apiFetch, ApiError, type ApiData } from '@/lib/api';
import { fieldErrors, friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/toast';
import { useVendorSession } from '@/components/vendor-shell';
import { Badge, Banner, Card, Empty, PageHeader, Skeleton, Spinner, titleCase } from './ui';

type StoreInfo = { name: string; slug: string; email: string; phone: string | null; business_address: string | null };
type Domain = { id: number; hostname: string; is_verified: boolean };

export function VendorStoreSettings() {
  const session = useVendorSession();
  const toast = useToast();
  const vendor = session?.vendor;
  const canEdit = ['owner', 'manager'].includes(session?.role ?? '') && vendor?.status === 'active';
  const [info, setInfo] = useState<StoreInfo | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!vendor) return;
    apiFetch<ApiData<{ vendor: StoreInfo }>>(`/v1/vendor/${vendor.slug}/application`).then(r => setInfo(r.data.vendor)).catch(c => toast.error(friendlyMessage(c, 'Could not load your store details.')));
  }, [vendor, toast]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vendor) return;
    const f = new FormData(event.currentTarget);
    const text = (k: string) => String(f.get(k) ?? '').trim();
    setBusy(true); setErrors({});
    try {
      await apiFetch(`/v1/vendor/${vendor.slug}/profile`, { method: 'PUT', body: JSON.stringify({ name: text('name'), email: text('email'), phone: text('phone') || null, business_address: text('business_address') || null }) });
      toast.success('Store details saved.'); await session?.reload();
    } catch (cause) { setErrors(cause instanceof ApiError ? fieldErrors(cause) : {}); toast.error(friendlyMessage(cause, 'Could not save your store details.')); } finally { setBusy(false); }
  }

  const err = (k: string) => errors[k] ? <small className="field-error" role="alert">{errors[k]}</small> : null;
  return <>
    <PageHeader title="Store settings" description="Your business details, storefront address and domains." />
    {vendor && vendor.status !== 'active' && <Banner tone="info">Settings can be edited once your store is approved.</Banner>}
    <Card title="Business details" description="Shown to customers and used for order and quote emails.">
      {!info ? <div style={{ display: 'grid', gap: 14 }}><Skeleton h={42} /><Skeleton h={42} /></div> : <form key={info.slug} className="form-grid" onSubmit={save}>
        <div className={`form-field${errors.name ? ' has-error' : ''}`}><label htmlFor="s-name">Store name</label><input id="s-name" name="name" defaultValue={info.name} maxLength={160} required disabled={!canEdit} />{err('name')}</div>
        <div className={`form-field${errors.email ? ' has-error' : ''}`}><label htmlFor="s-email">Contact email</label><input id="s-email" name="email" type="email" defaultValue={info.email} required disabled={!canEdit} />{err('email')}</div>
        <div className="form-field"><label htmlFor="s-phone">Phone</label><input id="s-phone" name="phone" type="tel" defaultValue={info.phone ?? ''} disabled={!canEdit} />{err('phone')}</div>
        <div className="form-field"><label htmlFor="s-slug">Store address</label><input id="s-slug" value={info.slug} readOnly /><small>Your address is assigned during approval. Contact support to change it.</small></div>
        <div className="form-field form-wide"><label htmlFor="s-addr">Business address</label><textarea id="s-addr" name="business_address" defaultValue={info.business_address ?? ''} maxLength={1000} disabled={!canEdit} />{err('business_address')}</div>
        <div className="form-wide"><button className="btn primary" disabled={!canEdit || busy}>{busy ? <><Spinner />Saving…</> : 'Save changes'}</button></div>
      </form>}
    </Card>
    <Card title="Branding & website" description="Logo, colours, navigation, footer and SEO live in the website tools.">
      <Link className="btn" href="/vendor/website"><Palette size={15} />Open appearance settings</Link>
    </Card>
    <Domains />
  </>;
}

function Domains() {
  const session = useVendorSession();
  const toast = useToast();
  const vendor = session?.vendor;
  const approved = vendor?.status === 'active' && ['owner', 'manager'].includes(session?.role ?? '');
  const [rows, setRows] = useState<Domain[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!vendor) return;
    try { setRows((await apiFetch<ApiData<Domain[]>>(`/v1/vendor/${vendor.slug}/domains`)).data); } catch { setRows([]); }
  }, [vendor]);
  useEffect(() => { void load(); }, [load]);

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vendor) return;
    const form = event.currentTarget;
    setBusy(true);
    try {
      const res = await apiFetch<ApiData<Domain>>(`/v1/vendor/${vendor.slug}/domains`, { method: 'POST', body: JSON.stringify({ hostname: new FormData(form).get('hostname') }) });
      toast.success(res.message || 'Domain added.'); form.reset(); await load();
    } catch (cause) { toast.error(friendlyMessage(cause, 'Could not add the domain.')); } finally { setBusy(false); }
  }

  async function remove(d: Domain) {
    if (!vendor || !window.confirm(`Remove ${d.hostname}?`)) return;
    try { await apiFetch(`/v1/vendor/${vendor.slug}/domains/${d.id}`, { method: 'DELETE' }); toast.success('Domain removed.'); await load(); }
    catch (cause) { toast.error(friendlyMessage(cause, 'Could not remove the domain.')); }
  }

  return <Card title="Domains" description="Your storefront hostname is assigned when your store is approved. A domain serves your storefront once it is verified and activated by an administrator.">
    {rows === null ? <Skeleton h={40} /> : rows.length === 0 ? <Empty icon={<Globe />} title="No domains yet" text="Your platform address will appear here after approval." /> :
      <div style={{ marginBottom: 18 }}>{rows.map(d => <div className="vp-item" key={d.id} style={{ alignItems: 'center' }}>
        <span><b style={{ color: 'var(--vp-ink)' }}>{d.hostname}</b></span>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Badge tone={d.is_verified ? 'ok' : 'warn'}>{d.is_verified ? 'Live' : titleCase('awaiting activation')}</Badge><button className="btn sm icon danger" style={{ width: 32 }} disabled={!approved} onClick={() => void remove(d)} aria-label={`Remove ${d.hostname}`}><Trash2 size={14} /></button></span>
      </div>)}</div>}
    <form className="form-grid" onSubmit={add} style={{ alignItems: 'end' }}>
      <div className="form-field"><label htmlFor="d-host">Add a custom domain</label><input id="d-host" name="hostname" placeholder="shop.example.com" disabled={!approved} required /></div>
      <div><button className="btn primary" disabled={!approved || busy}>{busy ? <><Spinner />Adding…</> : 'Add domain'}</button></div>
    </form>
  </Card>;
}
