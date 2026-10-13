'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, type ApiData, type ApiPage } from '@/lib/api';
import { useVendorSession } from './vendor-shell';

type Quote = { id: number; reference: string; contact_name: string; email: string; product_type: string; quantity: number; size?: string | null; paper_type?: string | null; finish?: string | null; notes?: string | null; status: string; quoted_price?: string | null; vendor_response?: string | null; created_at: string };

export function VendorPrinting() {
  const session = useVendorSession();
  const vendor = session?.vendor;
  const [rows, setRows] = useState<Quote[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [target, setTarget] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!vendor) return;
    try {
      const page = await apiFetch<ApiPage<Quote>>(`/v1/vendor/${vendor.slug}/printing/quotes`);
      setRows(page.data); setError('');
    } catch (cause) {
      setError(vendor.status !== 'active' ? 'Printing quotes unlock after your store is approved.' : cause instanceof Error ? cause.message : 'Could not load quote requests.');
    } finally { setLoaded(true); }
  }, [vendor]);
  useEffect(() => { void load(); }, [load]);

  async function respond(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vendor || !target) return;
    const form = new FormData(event.currentTarget);
    const status = String(form.get('status'));
    setBusy(true); setError(''); setMessage('');
    try {
      await apiFetch<ApiData<Quote>>(`/v1/vendor/${vendor.slug}/printing/quotes/${target.id}`, { method: 'PATCH', body: JSON.stringify({ status, quoted_price: status === 'quoted' ? form.get('quoted_price') : null, vendor_response: form.get('vendor_response') || null }) });
      setTarget(null); setMessage('Response sent.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send the response.'); } finally { setBusy(false); }
  }

  return <div className="dashboard-wrap">
    <div className="dashboard-heading"><div><span className="eyebrow">Printing services</span><h1>Quote requests</h1></div></div>
    <div className="panel">
      <p className="muted">Custom printing requests sent to your store. Respond with a quote or decline.</p>
      {error && <div className="notice" role="alert">{error}</div>}
      {message && <div className="notice" role="status">{message}</div>}
      {target && <form className="form-grid" onSubmit={respond}>
        <div className="form-field form-wide"><b>{target.reference}</b> · {target.quantity} × {target.product_type}</div>
        <div className="form-field"><label>Decision</label><select name="status" defaultValue="quoted"><option value="quoted">Send quote</option><option value="declined">Decline</option></select></div>
        <div className="form-field"><label>Quoted price (PKR)</label><input name="quoted_price" type="number" min="0" step="0.01" defaultValue={target.quoted_price ?? ''} /></div>
        <div className="form-field form-wide"><label>Message to customer</label><textarea name="vendor_response" defaultValue={target.vendor_response ?? ''} maxLength={5000} /></div>
        <div className="form-wide"><button className="button-primary" disabled={busy}>{busy ? 'Sending…' : 'Send response'}</button> <button type="button" className="button-secondary" onClick={() => setTarget(null)}>Cancel</button></div>
      </form>}
      {!loaded ? <div className="empty-products" role="status">Loading quote requests…</div> : !rows.length ? <div className="empty-products">No quote requests yet.</div> :
        <div className="table-scroll"><table><thead><tr><th>Reference</th><th>Customer</th><th>Job</th><th>Notes</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map(q => <tr key={q.id}>
          <td>{q.reference}</td><td>{q.contact_name}<br /><span className="muted">{q.email}</span></td>
          <td>{q.quantity} × {q.product_type}{[q.size, q.paper_type, q.finish].filter(Boolean).map(v => ` · ${v}`).join('')}</td>
          <td>{q.notes || '—'}</td><td>{q.status}{q.quoted_price ? ` · PKR ${q.quoted_price}` : ''}</td>
          <td><button className="button-secondary" disabled={vendor?.status !== 'active'} onClick={() => { setMessage(''); setTarget(q); }}>{q.status === 'submitted' ? 'Respond' : 'Update'}</button></td>
        </tr>)}</tbody></table></div>}
    </div>
  </div>;
}
