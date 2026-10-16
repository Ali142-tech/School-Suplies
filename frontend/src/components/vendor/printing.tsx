'use client';

import { useCallback, useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { apiFetch, type ApiPage } from '@/lib/api';
import { money } from '@/lib/data';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/toast';
import { useVendorSession } from '@/components/vendor-shell';
import { Badge, Banner, Card, Drawer, Empty, PageHeader, Spinner, TableSkeleton, statusTone, titleCase } from './ui';

type Quote = { id: number; reference: string; contact_name: string; email: string; product_type: string; quantity: number; size?: string | null; paper_type?: string | null; finish?: string | null; notes?: string | null; status: string; quoted_price?: string | null; vendor_response?: string | null; created_at: string };

export function VendorPrinting() {
  const session = useVendorSession();
  const toast = useToast();
  const vendor = session?.vendor;
  const canEdit = vendor?.status === 'active';
  const [rows, setRows] = useState<Quote[] | null>(null);
  const [error, setError] = useState('');
  const [target, setTarget] = useState<Quote | null>(null);
  const [decision, setDecision] = useState('quoted');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!vendor) return;
    try { setRows((await apiFetch<ApiPage<Quote>>(`/v1/vendor/${vendor.slug}/printing/quotes`)).data); setError(''); }
    catch (cause) { setError(vendor.status !== 'active' ? 'Printing quotes unlock after your store is approved.' : friendlyMessage(cause, 'Could not load quote requests.')); setRows([]); }
  }, [vendor]);
  useEffect(() => { void load(); }, [load]);

  async function respond(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vendor || !target) return;
    const f = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await apiFetch(`/v1/vendor/${vendor.slug}/printing/quotes/${target.id}`, { method: 'PATCH', body: JSON.stringify({ status: decision, quoted_price: decision === 'quoted' ? f.get('quoted_price') : null, vendor_response: f.get('vendor_response') || null }) });
      toast.success('Response sent to the customer.'); setTarget(null); await load();
    } catch (cause) { toast.error(friendlyMessage(cause, 'Could not send the response.')); } finally { setBusy(false); }
  }

  return <>
    <PageHeader title="Printing quotes" description="Custom printing requests sent to your store. Reply with a price or decline politely." />
    {error && <Banner tone={vendor?.status === 'active' ? 'bad' : 'info'}>{error}</Banner>}
    <Card flush>
      {rows === null ? <TableSkeleton rows={4} /> : rows.length === 0 ? <Empty icon={<Printer />} title="No quote requests yet" text="Requests from customers appear here." />
        : <div className="table-scroll"><table>
          <thead><tr><th>Reference</th><th>Customer</th><th>Job</th><th>Status</th><th /></tr></thead>
          <tbody>{rows.map(q => <tr key={q.id}>
            <td><b>{q.reference}</b><br /><span className="muted" style={{ fontSize: 12 }}>{new Date(q.created_at).toLocaleDateString()}</span></td>
            <td>{q.contact_name}<br /><span className="muted" style={{ fontSize: 12.5 }}>{q.email}</span></td>
            <td style={{ maxWidth: 280 }}>{q.quantity} × {q.product_type}<span className="muted">{[q.size, q.paper_type, q.finish].filter(Boolean).map(v => ` · ${v}`).join('')}</span>{q.notes && <div className="muted" style={{ fontSize: 12.5 }}>“{q.notes}”</div>}</td>
            <td><Badge tone={statusTone(q.status)}>{titleCase(q.status)}</Badge>{q.quoted_price && <div style={{ fontSize: 12.5, marginTop: 4 }}>{money(Number(q.quoted_price), 'PKR')}</div>}</td>
            <td><div className="vp-row-actions"><button className="btn sm" disabled={!canEdit} onClick={() => { setDecision(q.status === 'declined' ? 'declined' : 'quoted'); setTarget(q); }}>{q.status === 'submitted' ? 'Respond' : 'Update'}</button></div></td>
          </tr>)}</tbody>
        </table></div>}
    </Card>

    <Drawer open={!!target} title={target ? `Quote ${target.reference}` : ''} onClose={() => setTarget(null)} footer={<><button type="button" className="btn" onClick={() => setTarget(null)}>Cancel</button><button form="quote-form" className="btn primary" disabled={busy}>{busy ? <><Spinner />Sending…</> : 'Send response'}</button></>}>
      {target && <form id="quote-form" key={target.id} className="form-grid" onSubmit={respond}>
        <p className="form-wide muted">{target.quantity} × {target.product_type}{[target.size, target.paper_type, target.finish].filter(Boolean).map(v => ` · ${v}`).join('')} for {target.contact_name}.</p>
        <div className="form-field"><label htmlFor="q-dec">Decision</label><select id="q-dec" value={decision} onChange={e => setDecision(e.target.value)}><option value="quoted">Send a quote</option><option value="declined">Decline</option></select></div>
        {decision === 'quoted' && <div className="form-field"><label htmlFor="q-price">Quoted price (PKR)</label><input id="q-price" name="quoted_price" type="number" min="0" step="0.01" defaultValue={target.quoted_price ?? ''} required /></div>}
        <div className="form-field form-wide"><label htmlFor="q-msg">Message to customer</label><textarea id="q-msg" name="vendor_response" defaultValue={target.vendor_response ?? ''} maxLength={5000} /></div>
      </form>}
    </Drawer>
  </>;
}
