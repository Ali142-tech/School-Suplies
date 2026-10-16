'use client';

import { useCallback, useEffect, useState } from 'react';
import { Trash2, UserPlus, Users } from 'lucide-react';
import { apiFetch, ApiError, type ApiPage } from '@/lib/api';
import { fieldErrors, friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/toast';
import { ConfirmDialog } from '@/components/cms/confirm-dialog';
import { useVendorSession } from '@/components/vendor-shell';
import { Badge, Banner, Card, Drawer, Empty, PageHeader, Spinner, TableSkeleton, titleCase } from './ui';

type Member = { id: number; role: string; user: { id: number; name: string; email: string } };

export function VendorTeam() {
  const session = useVendorSession();
  const toast = useToast();
  const vendor = session?.vendor;
  const canEdit = ['owner', 'manager'].includes(session?.role ?? '') && vendor?.status === 'active';
  const [rows, setRows] = useState<Member[] | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const load = useCallback(async () => {
    if (!vendor) return;
    try { setRows((await apiFetch<ApiPage<Member>>(`/v1/vendor/${vendor.slug}/members`)).data); setError(''); }
    catch (cause) { setError(friendlyMessage(cause, 'Only owners and managers can view the team.')); setRows([]); }
  }, [vendor]);
  useEffect(() => { void load(); }, [load]);

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vendor) return;
    const f = new FormData(event.currentTarget);
    setBusy(true); setFieldError('');
    try {
      await apiFetch(`/v1/vendor/${vendor.slug}/members`, { method: 'POST', body: JSON.stringify({ email: String(f.get('email')).trim(), role: f.get('role') }) });
      toast.success('Team member added.'); setAdding(false); await load();
    } catch (cause) { setFieldError(cause instanceof ApiError ? (fieldErrors(cause).email ?? friendlyMessage(cause)) : friendlyMessage(cause)); } finally { setBusy(false); }
  }

  async function remove() {
    if (!vendor || !removing) return;
    setBusy(true);
    try { await apiFetch(`/v1/vendor/${vendor.slug}/members/${removing.id}`, { method: 'DELETE' }); toast.success('Team member removed.'); setRemoving(null); await load(); }
    catch (cause) { toast.error(friendlyMessage(cause, 'Could not remove the team member.')); } finally { setBusy(false); }
  }

  return <>
    <PageHeader title="Team" description="Give colleagues access to your store. Managers can edit everything; staff can view."
      actions={<button className="btn primary" disabled={!canEdit} onClick={() => { setFieldError(''); setAdding(true); }}><UserPlus size={15} />Add member</button>} />
    {error && <Banner tone="info">{error}</Banner>}
    <Card flush>
      {rows === null ? <TableSkeleton rows={3} /> : rows.length === 0 ? <Empty icon={<Users />} title="No team members" text="Add a colleague by the email they registered with." />
        : <div className="table-scroll"><table>
          <thead><tr><th>Member</th><th>Role</th><th /></tr></thead>
          <tbody>{rows.map(m => <tr key={m.id}>
            <td><div className="vp-cell"><span className="vp-avatar">{m.user.name.slice(0, 1)}</span><div><b>{m.user.name}{m.user.id === session?.user.id && <span className="muted"> (you)</span>}</b><div className="muted" style={{ fontSize: 12.5 }}>{m.user.email}</div></div></div></td>
            <td><Badge tone={m.role === 'manager' ? 'info' : ''}>{titleCase(m.role)}</Badge></td>
            <td><div className="vp-row-actions">{m.user.id !== session?.user.id && <button className="btn sm icon danger" style={{ width: 32 }} disabled={!canEdit} onClick={() => setRemoving(m)} aria-label={`Remove ${m.user.name}`}><Trash2 size={14} /></button>}</div></td>
          </tr>)}</tbody>
        </table></div>}
    </Card>

    <Drawer open={adding} title="Add team member" onClose={() => setAdding(false)} footer={<><button type="button" className="btn" onClick={() => setAdding(false)}>Cancel</button><button form="member-form" className="btn primary" disabled={busy}>{busy ? <><Spinner />Adding…</> : 'Add member'}</button></>}>
      <form id="member-form" className="form-grid" onSubmit={add}>
        <div className={`form-field form-wide${fieldError ? ' has-error' : ''}`}><label htmlFor="m-email">Email address</label><input id="m-email" name="email" type="email" required placeholder="colleague@example.com" />{fieldError ? <small className="field-error" role="alert">{fieldError}</small> : <small>They must already have a Papertrail account.</small>}</div>
        <div className="form-field form-wide"><label htmlFor="m-role">Role</label><select id="m-role" name="role" defaultValue="staff"><option value="staff">Staff — view only</option><option value="manager">Manager — full access</option></select></div>
      </form>
    </Drawer>
    <ConfirmDialog open={!!removing} danger title="Remove this team member?" message={`${removing?.user.name ?? ''} will lose access to your store immediately.`} confirmLabel="Remove" busy={busy} onCancel={() => setRemoving(null)} onConfirm={() => void remove()} />
  </>;
}
