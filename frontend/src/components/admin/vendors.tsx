'use client';

import { useMemo, useState } from 'react';
import { Building2, CheckCircle2, Globe, PauseCircle, PlayCircle, XCircle } from 'lucide-react';
import { apiFetch, type ApiData } from '@/lib/api';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/toast';
import { usePaged } from '@/lib/use-paged';
import { Badge, Banner, Card, Chips, ConfirmModal, Drawer, Empty, PageHeader, Pager, SearchBox, TableSkeleton, fmtDate, statusTone, titleCase } from '@/components/portal/ui';
import { PENDING_CHANGED } from './shell';

type Domain = { id: number; hostname: string; is_verified: boolean; provisioning_status: string; is_primary: boolean };
type Vendor = {
  id: number; name: string; slug: string; requested_slug?: string | null; status: string; email: string; phone?: string | null; business_address?: string | null;
  rejection_reason?: string | null; created_at: string; products_count?: number; owner?: { name: string; email: string; phone?: string | null } | null;
  category?: { name: string } | null; domains?: Domain[]; memberships?: { id: number; role: string; user?: { name: string; email: string } }[];
};
const STATUSES = ['all', 'pending', 'active', 'suspended', 'rejected'] as const;
type Status = (typeof STATUSES)[number];
const PLATFORM = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || '').replace(/^\.+/, '');
type Dialog = { kind: 'approve' | 'reject' | 'suspend' | 'reactivate' | 'domain'; vendor: Vendor; domain?: Domain } | null;

/** Vendor directory and review queue. `initialStatus` is "pending" on the applications page and "all" on the directory. */
export function AdminVendors({ initialStatus = 'all', title, description }: { initialStatus?: Status; title: string; description: string }) {
  const toast = useToast();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [query, setQuery] = useState('');
  const list = usePaged<Vendor>(`/v1/admin/vendor-requests?status=${status}`, [status]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Vendor | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [slug, setSlug] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (list.rows ?? []).filter(v => !q || [v.name, v.slug, v.email, v.owner?.name].some(x => x?.toLowerCase().includes(q)));
  }, [list.rows, query]);

  async function open(v: Vendor) {
    setOpenId(v.id); setDetail(v);
    try { setDetail((await apiFetch<ApiData<Vendor>>(`/v1/admin/vendor-requests/${v.id}`)).data); } catch (cause) { toast.error(friendlyMessage(cause, 'Could not load the full application.')); }
  }
  async function refresh(id?: number) {
    await list.reload();
    if (id) try { setDetail((await apiFetch<ApiData<Vendor>>(`/v1/admin/vendor-requests/${id}`)).data); } catch { /* the list refresh already surfaced any error */ }
  }

  function ask(next: Dialog) {
    setDialog(next); setReason('');
    setSlug(next?.vendor.requested_slug || next?.vendor.slug || '');
  }

  async function confirm() {
    if (!dialog) return;
    const { kind, vendor, domain } = dialog;
    setBusy(true);
    try {
      let result: { message?: string } = {};
      if (kind === 'approve') result = await apiFetch(`/v1/admin/vendor-requests/${vendor.id}/approve`, { method: 'POST', body: JSON.stringify({ slug }) });
      if (kind === 'reject') result = await apiFetch(`/v1/admin/vendor-requests/${vendor.id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
      if (kind === 'suspend') result = await apiFetch(`/v1/admin/vendors/${vendor.id}/suspend`, { method: 'PATCH' });
      if (kind === 'reactivate') result = await apiFetch(`/v1/admin/vendors/${vendor.id}/reactivate`, { method: 'PATCH' });
      if (kind === 'domain' && domain) result = await apiFetch(`/v1/admin/domains/${domain.id}/activate`, { method: 'POST', body: JSON.stringify({ dns_configured: true }) });
      toast.success(result.message || 'Done.');
      setDialog(null); window.dispatchEvent(new Event(PENDING_CHANGED)); await refresh(openId ?? undefined);
    } catch (cause) { toast.error(friendlyMessage(cause, 'That action could not be completed.')); } finally { setBusy(false); }
  }

  const copy: Record<NonNullable<Dialog>['kind'], { title: string; text?: string; label: string; tone?: 'danger' | 'primary' }> = {
    approve: { title: 'Approve this vendor?', text: 'The store goes live on the address below. Domain and DNS setup remain a separate manual step.', label: 'Approve vendor' },
    reject: { title: 'Reject this application?', text: 'The applicant is shown your reason and can resubmit.', label: 'Reject application', tone: 'danger' },
    suspend: { title: 'Suspend this vendor?', text: 'Their storefront domains are disabled and selling tools are unavailable until reactivated.', label: 'Suspend vendor', tone: 'danger' },
    reactivate: { title: 'Reactivate this vendor?', text: 'Confirm DNS is still configured, then activate their domain mapping.', label: 'Reactivate vendor' },
    domain: { title: 'Activate domain mapping?', text: dialog?.domain ? `Confirm DNS and hosting are configured for ${dialog.domain.hostname}.` : '', label: 'Activate domain' },
  };
  const slugOk = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);

  return <>
    <PageHeader title={title} description={description} />
    <Card flush>
      <div className="vp-toolbar"><Chips options={STATUSES} value={status} onChange={setStatus} label="Filter by status" format={s => s === 'active' ? 'Approved' : titleCase(s)} /><span className="vp-spacer" style={{ flex: 1 }} /><SearchBox value={query} onChange={setQuery} placeholder="Search this page…" /></div>
      {list.error && <div style={{ padding: 18 }}><Banner tone="bad">{list.error}</Banner></div>}
      {list.rows === null ? <TableSkeleton /> : visible.length === 0 ? <Empty icon={<Building2 />} title={query ? 'No matches' : `No ${status === 'all' ? '' : `${status === 'active' ? 'approved' : status} `}vendors`} text={query ? 'Try a different search.' : 'Nothing here yet.'} /> :
        <div className="table-scroll"><table>
          <thead><tr><th>Store</th><th>Owner</th><th>Category</th><th>Products</th><th>Applied</th><th>Status</th><th /></tr></thead>
          <tbody>{visible.map(v => <tr key={v.id}>
            <td><b>{v.name}</b><br /><span className="muted" style={{ fontSize: 12 }}>/{v.slug}</span></td>
            <td>{v.owner?.name ?? '—'}<br /><span className="muted" style={{ fontSize: 12 }}>{v.owner?.email ?? v.email}</span></td>
            <td>{v.category?.name ?? '—'}</td><td>{v.products_count ?? 0}</td><td>{fmtDate(v.created_at)}</td>
            <td><Badge tone={statusTone(v.status)}>{titleCase(v.status)}</Badge></td>
            <td><div className="vp-row-actions"><button className="btn sm" onClick={() => void open(v)}>{v.status === 'pending' ? 'Review' : 'Details'}</button></div></td>
          </tr>)}</tbody></table></div>}
      <Pager meta={list.meta} page={list.page} onPage={list.setPage} />
    </Card>

    <Drawer open={openId !== null} title={detail?.name ?? 'Vendor'} onClose={() => { setOpenId(null); setDetail(null); }}
      footer={detail && <>
        {detail.status === 'pending' && <><button className="btn danger" onClick={() => ask({ kind: 'reject', vendor: detail })}><XCircle size={15} />Reject</button><button className="btn primary" onClick={() => ask({ kind: 'approve', vendor: detail })}><CheckCircle2 size={15} />Approve</button></>}
        {detail.status === 'active' && <button className="btn danger" onClick={() => ask({ kind: 'suspend', vendor: detail })}><PauseCircle size={15} />Suspend</button>}
        {detail.status === 'suspended' && <button className="btn primary" onClick={() => ask({ kind: 'reactivate', vendor: detail })}><PlayCircle size={15} />Reactivate</button>}
      </>}>
      {detail && <>
        <dl className="vp-kv" style={{ marginBottom: 22 }}>
          <dt>Status</dt><dd><Badge tone={statusTone(detail.status)}>{titleCase(detail.status)}</Badge></dd>
          <dt>Owner</dt><dd>{detail.owner?.name ?? '—'}<br /><span className="muted">{detail.owner?.email}{detail.owner?.phone ? ` · ${detail.owner.phone}` : ''}</span></dd>
          <dt>Business email</dt><dd>{detail.email}</dd><dt>Phone</dt><dd>{detail.phone || '—'}</dd>
          <dt>Address</dt><dd>{detail.business_address || '—'}</dd><dt>Category</dt><dd>{detail.category?.name ?? '—'}</dd>
          <dt>Requested slug</dt><dd><code>{detail.requested_slug || detail.slug}</code></dd><dt>Applied</dt><dd>{fmtDate(detail.created_at)}</dd>
          {detail.rejection_reason && <><dt>Rejection reason</dt><dd>{detail.rejection_reason}</dd></>}
        </dl>
        <h4 style={{ marginBottom: 6 }}>Domains</h4>
        {(detail.domains ?? []).length === 0 ? <p className="muted" style={{ marginBottom: 20 }}>No domain mapped yet. One is created when the vendor is approved.</p> : <div style={{ marginBottom: 22 }}>{detail.domains!.map(d => <div className="vp-item" key={d.id}>
          <span><Globe size={14} style={{ verticalAlign: '-2px' }} /> {d.hostname}{d.is_primary && <> <Badge tone="info">Primary</Badge></>}</span>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Badge tone={d.provisioning_status === 'active' ? 'ok' : 'warn'}>{titleCase(d.provisioning_status)}</Badge>
            {d.provisioning_status !== 'active' && detail.status === 'active' && <button className="btn sm" onClick={() => ask({ kind: 'domain', vendor: detail, domain: d })}>Activate</button>}</span></div>)}</div>}
        <h4 style={{ marginBottom: 6 }}>Team</h4>
        {(detail.memberships ?? []).length === 0 ? <p className="muted">Only the owner has access.</p> : detail.memberships!.map(m => <div className="vp-item" key={m.id}><span>{m.user?.name}<br /><span className="muted" style={{ fontSize: 12 }}>{m.user?.email}</span></span><Badge tone="info">{titleCase(m.role)}</Badge></div>)}
      </>}
    </Drawer>

    <ConfirmModal open={!!dialog} busy={busy} tone={dialog ? copy[dialog.kind].tone : 'primary'} title={dialog ? copy[dialog.kind].title : ''} text={dialog ? copy[dialog.kind].text : ''} confirmLabel={dialog ? copy[dialog.kind].label : ''}
      disabled={dialog?.kind === 'approve' ? !slugOk : dialog?.kind === 'reject' ? reason.trim().length < 5 : false} onConfirm={() => void confirm()} onCancel={() => setDialog(null)}>
      {dialog?.kind === 'approve' && <div className={`form-field${slug && !slugOk ? ' has-error' : ''}`}><label htmlFor="approve-slug">Store address</label>
        <div className="vp-slug"><input id="approve-slug" value={slug} maxLength={63} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} /><span>.{PLATFORM || 'your-domain'}</span></div>
        {slug && !slugOk && <small className="field-error">Use lowercase letters, numbers and single hyphens.</small>}</div>}
      {dialog?.kind === 'reject' && <div className="form-field"><label htmlFor="reject-reason">Reason (shown to the applicant)</label><textarea id="reject-reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={2000} placeholder="Explain what needs to change…" /><small>At least 5 characters.</small></div>}
    </ConfirmModal>
  </>;
}
