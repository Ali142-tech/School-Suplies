'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, clearAccessToken, hasAccessToken, type ApiData, type ApiPage } from '@/lib/api';

type VendorApplication = {
  id: number; name: string; slug: string; requested_slug: string; status: string; email: string; phone: string;
  business_address?: string; created_at: string; rejection_reason?: string; owner?: { name: string; email: string; phone?: string };
  category?: { name: string }; domains?: { id: number; hostname: string; is_verified: boolean; provisioning_status: string }[];
};

export function AdminVendorRequests() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState<VendorApplication[]>([]);
  const [selected, setSelected] = useState<VendorApplication | null>(null);
  const [slug, setSlug] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (next = status) => {
    if (!authorized) return;
    setLoading(true); setError('');
    try { const result = await apiFetch<ApiPage<VendorApplication>>(`/v1/admin/vendor-requests?status=${next}`); setRows(result.data); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load vendor requests.'); }
    finally { setLoading(false); }
  }, [status, authorized]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let live = true;
    if (!hasAccessToken()) { router.replace('/admin/login'); return () => { live = false; }; }
    void apiFetch<ApiData<{ role: string }>>('/v1/auth/me').then(({ data }) => {
      if (!live) return;
      if (data.role !== 'platform_admin') { clearAccessToken(); router.replace('/admin/login'); return; }
      setAuthorized(true);
    }).catch(() => { if (live) { clearAccessToken(); router.replace('/admin/login'); } }).finally(() => { if (live) setCheckingAuth(false); });
    return () => { live = false; };
  }, [router]);

  async function review(action: 'approve' | 'reject') {
    if (!selected) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const body = action === 'approve' ? { slug } : { reason };
      const result = await apiFetch<ApiData<VendorApplication>>(`/v1/admin/vendor-requests/${selected.id}/${action}`, { method: 'POST', body: JSON.stringify(body) });
      setMessage(result.message || `Application ${action}d.`); setSelected(null); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update this application.'); }
    finally { setBusy(false); }
  }

  async function vendorAction(vendor: VendorApplication, action: 'suspend' | 'reactivate') {
    setError(''); setMessage('');
    try { await apiFetch(`/v1/admin/vendors/${vendor.id}/${action}`, { method: 'PATCH' }); setMessage(`Vendor ${action}d.`); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : `Could not ${action} vendor.`); }
  }

  async function activate(domain: NonNullable<VendorApplication['domains']>[number]) {
    if (!window.confirm(`Confirm Vercel and DNS are configured for ${domain.hostname}?`)) return;
    setError(''); setMessage('');
    try { await apiFetch(`/v1/admin/domains/${domain.id}/activate`, { method: 'POST', body: JSON.stringify({ dns_configured: true }) }); setMessage(`${domain.hostname} is active.`); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not activate domain.'); }
  }

  if (checkingAuth || !authorized) return <div className="empty-products" role="status">Checking administrator access…</div>;
  return <div className="dashboard-wrap">
    <div className="dashboard-heading"><div><span className="eyebrow">Platform administration</span><h1>Vendor requests</h1><p>Review vendor applications, domains, and account status.</p></div><Link className="button-secondary" href="/admin/dashboard">Admin dashboard</Link></div>
    <nav className="tabs">{['pending', 'active', 'rejected', 'suspended', 'all'].map(tab => <button key={tab} className="button-secondary" aria-pressed={status === tab} onClick={() => setStatus(tab)}>{tab === 'active' ? 'Approved' : tab[0].toUpperCase() + tab.slice(1)}</button>)}</nav>
    {error && <div className="notice" role="alert">{error}</div>}{message && <div className="notice" role="status">{message}</div>}
    {loading ? <div className="empty-products" role="status">Loading vendor applications…</div> : rows.length === 0 ? <div className="empty-products">No {status === 'all' ? '' : status} applications found.</div> : <div className="panel table-scroll"><table><thead><tr><th>Vendor / store</th><th>Contact</th><th>Category</th><th>Registered</th><th>Status</th><th>Requested slug</th><th>Assigned domain</th><th>Actions</th></tr></thead><tbody>{rows.map(vendor => <tr key={vendor.id}><td>{vendor.owner?.name || '—'}<br/><strong>{vendor.name}</strong></td><td>{vendor.email}<br/>{vendor.phone || '—'}</td><td>{vendor.category?.name || '—'}</td><td>{new Date(vendor.created_at).toLocaleDateString()}</td><td><span className={`status ${vendor.status === 'pending' ? 'pending' : ''}`}>{vendor.status === 'active' ? 'approved' : vendor.status}</span></td><td>{vendor.requested_slug || vendor.slug}</td><td>{vendor.domains?.map(domain => <div key={domain.id}>{domain.hostname}<br/><small>{domain.provisioning_status}</small>{domain.provisioning_status === 'manual_pending' && vendor.status === 'active' && <div><button className="button-secondary" onClick={() => void activate(domain)}>Mark DNS ready</button></div>}</div>) || '—'}</td><td><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><button className="button-secondary" onClick={async () => { try { const response = await apiFetch<ApiData<VendorApplication>>(`/v1/admin/vendor-requests/${vendor.id}`); setSelected(response.data); setSlug(response.data.requested_slug || response.data.slug); setReason(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load details.'); } }}>Details</button>{vendor.status === 'pending' && <><button className="button-primary" onClick={() => {setSelected(vendor);setSlug(vendor.requested_slug || vendor.slug);setReason('');}}>Approve</button><button className="button-secondary" onClick={() => {setSelected(vendor);setReason('');}}>Reject</button></>}{vendor.status === 'active' && <button className="button-secondary" onClick={() => void vendorAction(vendor, 'suspend')}>Suspend</button>}{vendor.status === 'suspended' && <button className="button-secondary" onClick={() => void vendorAction(vendor, 'reactivate')}>Reactivate</button>}</div></td></tr>)}</tbody></table></div>}
    {selected && <div role="dialog" aria-modal="true" aria-labelledby="vendor-review-title" className="panel" style={{maxWidth:760,margin:'20px auto'}}><div style={{display:'flex',justifyContent:'space-between'}}><h2 id="vendor-review-title" className="panel-title">Application: {selected.name}</h2><button className="button-secondary" onClick={() => setSelected(null)}>Close</button></div><p><b>Applicant:</b> {selected.owner?.name || '—'} · {selected.owner?.email || selected.email} · {selected.owner?.phone || selected.phone || 'No phone'}</p><p><b>Business address:</b> {selected.business_address || '—'}</p><p><b>Category:</b> {selected.category?.name || '—'} · <b>Requested slug:</b> {selected.requested_slug || selected.slug}</p>{selected.rejection_reason && <div className="notice">Previous rejection: {selected.rejection_reason}</div>}
      {selected.status === 'pending' && <><div className="form-field"><label htmlFor="approved-slug">Approved store slug</label><input id="approved-slug" value={slug} onChange={event => setSlug(event.target.value.toLowerCase())} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={63} required/></div><p className="muted">Domain: {slug || 'store'}.{process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'configured-platform-domain'} (Vercel/DNS setup is a separate manual step.)</p><button className="button-primary" disabled={busy || !slug} onClick={() => void review('approve')}>{busy ? 'Approving…' : 'Confirm approval'}</button><hr/><div className="form-field"><label htmlFor="rejection-reason">Rejection reason</label><textarea id="rejection-reason" value={reason} onChange={event => setReason(event.target.value)} required minLength={5}/></div><button className="button-secondary" disabled={busy || reason.trim().length < 5} onClick={() => void review('reject')}>Reject application</button></>}
      {selected.status !== 'pending' && <div><p>Status: {selected.status}</p>{selected.domains?.map(domain => <p key={domain.id}>{domain.hostname} · {domain.provisioning_status}</p>)}</div>}
    </div>}
  </div>;
}
