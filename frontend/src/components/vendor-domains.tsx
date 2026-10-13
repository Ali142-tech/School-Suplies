'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, type ApiData } from '@/lib/api';
import { useVendorSession } from './vendor-shell';

type Domain = { id: number; hostname: string; is_verified: boolean; created_at: string };

/** Lists the store's domains from the existing API. Platform subdomains are assigned by a Super Admin during approval. */
export function VendorDomains() {
  const vendor = useVendorSession()?.vendor;
  const [rows, setRows] = useState<Domain[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!vendor) return;
    try { setRows((await apiFetch<ApiData<Domain[]>>(`/v1/vendor/${vendor.slug}/domains`)).data); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load domains.'); }
  }, [vendor]);
  useEffect(() => { void load(); }, [load]);

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vendor) return;
    const form = event.currentTarget;
    setError(''); setMessage('');
    try {
      const result = await apiFetch<ApiData<Domain>>(`/v1/vendor/${vendor.slug}/domains`, { method: 'POST', body: JSON.stringify({ hostname: new FormData(form).get('hostname') }) });
      setMessage(result.message || 'Domain added.'); form.reset(); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add the domain.'); }
  }

  async function remove(domain: Domain) {
    if (!vendor || !window.confirm(`Remove ${domain.hostname}?`)) return;
    try { await apiFetch(`/v1/vendor/${vendor.slug}/domains/${domain.id}`, { method: 'DELETE' }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove the domain.'); }
  }

  const approved = vendor?.status === 'active';
  return <div className="panel">
    <h2 className="panel-title">Domains</h2>
    <p className="muted">Your storefront hostname is assigned by the platform when your store is approved. A domain serves your storefront once it is verified and activated by an administrator.</p>
    {error && <div className="notice" role="alert">{error}</div>}
    {message && <div className="notice" role="status">{message}</div>}
    {!rows.length ? <div className="empty-products">No domains assigned yet.</div> : <div className="table-scroll"><table><thead><tr><th>Hostname</th><th>Status</th><th /></tr></thead><tbody>{rows.map(d => <tr key={d.id}><td>{d.hostname}</td><td>{d.is_verified ? 'Live' : 'Awaiting activation'}</td><td><button className="button-secondary" disabled={!approved} onClick={() => void remove(d)}>Remove</button></td></tr>)}</tbody></table></div>}
    <form className="form-grid" onSubmit={add} style={{ marginTop: 16 }}>
      <div className="form-field"><label>Add a custom domain</label><input name="hostname" placeholder="shop.example.com" disabled={!approved} required /></div>
      <div className="form-field" style={{ justifyContent: 'end' }}><button className="button-primary" disabled={!approved}>Add domain</button></div>
    </form>
  </div>;
}
