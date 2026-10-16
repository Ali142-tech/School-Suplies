'use client';

import { useCallback, useEffect, useState } from 'react';
import { School } from 'lucide-react';
import { apiFetch, type ApiPage } from '@/lib/api';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/toast';
import { useVendorSession } from '@/components/vendor-shell';
import { Badge, Banner, Card, Empty, PageHeader, TableSkeleton } from './ui';

type SchoolRow = { id: number; name: string; is_active: boolean; orders_count: number; user?: { name: string; email: string; phone?: string | null } };

export function VendorSchools() {
  const session = useVendorSession();
  const toast = useToast();
  const vendor = session?.vendor;
  const canEdit = ['owner', 'manager'].includes(session?.role ?? '') && vendor?.status === 'active';
  const [rows, setRows] = useState<SchoolRow[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!vendor) return;
    try { setRows((await apiFetch<ApiPage<SchoolRow>>(`/v1/vendor/${vendor.slug}/schools`)).data); setError(''); }
    catch (cause) { setError(vendor.status !== 'active' ? 'School accounts appear here once your store is approved.' : friendlyMessage(cause, 'Could not load school accounts.')); setRows([]); }
  }, [vendor]);
  useEffect(() => { void load(); }, [load]);

  async function toggle(school: SchoolRow) {
    if (!vendor) return;
    try {
      await apiFetch(`/v1/vendor/${vendor.slug}/schools/${school.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !school.is_active }) });
      toast.success(`${school.name} ${school.is_active ? 'disabled' : 'enabled'}.`); await load();
    } catch (cause) { toast.error(friendlyMessage(cause, 'Could not update the school.')); }
  }

  return <>
    <PageHeader title="School customers" description="School accounts registered on your storefront. Disable access at any time." />
    {error && <Banner tone={vendor?.status === 'active' ? 'bad' : 'info'}>{error}</Banner>}
    <Card flush>
      {rows === null ? <TableSkeleton rows={4} /> : rows.length === 0 ? <Empty icon={<School />} title="No school accounts yet" text="Schools that register on your storefront will appear here." />
        : <div className="table-scroll"><table>
          <thead><tr><th>School</th><th>Contact</th><th>Orders</th><th>Access</th><th /></tr></thead>
          <tbody>{rows.map(s => <tr key={s.id}>
            <td><b>{s.name}</b></td>
            <td>{s.user?.name}<br /><span className="muted" style={{ fontSize: 12.5 }}>{s.user?.email}{s.user?.phone ? ` · ${s.user.phone}` : ''}</span></td>
            <td>{s.orders_count}</td>
            <td><Badge tone={s.is_active ? 'ok' : 'bad'}>{s.is_active ? 'Active' : 'Disabled'}</Badge></td>
            <td><div className="vp-row-actions"><button className={`btn sm${s.is_active ? ' danger' : ''}`} disabled={!canEdit} onClick={() => void toggle(s)}>{s.is_active ? 'Disable' : 'Enable'}</button></div></td>
          </tr>)}</tbody>
        </table></div>}
    </Card>
  </>;
}
