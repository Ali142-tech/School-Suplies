'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { apiFetch, type ApiData } from '@/lib/api';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/toast';
import { ConfirmDialog } from '@/components/cms/confirm-dialog';
import { useVendorSession } from '@/components/vendor-shell';
import { Badge, Banner, Card, Drawer, Empty, PageHeader, Spinner, TableSkeleton } from './ui';

type Category = { id: number; name: string; slug: string; description?: string | null; is_active: boolean; products_count?: number };

export function VendorCategories() {
  const session = useVendorSession();
  const toast = useToast();
  const vendor = session?.vendor;
  const canEdit = ['owner', 'manager'].includes(session?.role ?? '') && vendor?.status === 'active';
  const [items, setItems] = useState<Category[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [removing, setRemoving] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!vendor) return;
    try { setItems((await apiFetch<ApiData<Category[]>>(`/v1/vendor/${vendor.slug}/categories`)).data); setError(''); }
    catch (cause) { setError(friendlyMessage(cause, 'Could not load categories.')); setItems([]); }
  }, [vendor]);
  useEffect(() => { void load(); }, [load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vendor || !editing) return;
    const f = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const existing = editing === 'new' ? null : editing;
      await apiFetch(`/v1/vendor/${vendor.slug}/categories${existing ? `/${existing.id}` : ''}`, { method: existing ? 'PUT' : 'POST', body: JSON.stringify({ name: String(f.get('name')).trim(), description: String(f.get('description') ?? '').trim() || null }) });
      toast.success(existing ? 'Category updated.' : 'Category added.'); setEditing(null); await load();
    } catch (cause) { toast.error(friendlyMessage(cause, 'Could not save the category.')); } finally { setBusy(false); }
  }

  async function toggle(c: Category) {
    if (!vendor) return;
    try {
      await apiFetch(`/v1/vendor/${vendor.slug}/categories/${c.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !c.is_active }) });
      toast.success(c.is_active ? 'Category hidden from your store.' : 'Category is visible again.'); await load();
    } catch (cause) { toast.error(friendlyMessage(cause, 'Could not update the category.')); }
  }

  async function remove() {
    if (!vendor || !removing) return;
    setBusy(true);
    try { await apiFetch(`/v1/vendor/${vendor.slug}/categories/${removing.id}`, { method: 'DELETE' }); toast.success('Category deleted.'); setRemoving(null); await load(); }
    catch (cause) { toast.error(friendlyMessage(cause, 'Could not delete the category.')); } finally { setBusy(false); }
  }

  const category = editing && editing !== 'new' ? editing : null;
  const used = removing?.products_count ?? 0;
  return <>
    <PageHeader title="Categories" description="Group your products your own way. These categories belong to your store only."
      actions={<button className="btn primary" disabled={!canEdit} onClick={() => setEditing('new')}><Plus size={15} />Add category</button>} />
    {vendor && vendor.status !== 'active' && <Banner tone="info">Categories can be added once your store is approved.</Banner>}
    {error && <Banner tone="bad">{error}</Banner>}
    <Card flush>
      {items === null ? <TableSkeleton rows={4} /> : items.length === 0 ? <Empty icon={<Tags />} title="No categories yet" text="Create a category, then pick it when you add a product." action={canEdit && <button className="btn primary" onClick={() => setEditing('new')}><Plus size={15} />Add category</button>} />
        : <div className="table-scroll"><table>
          <thead><tr><th>Name</th><th>Products</th><th>Visibility</th><th /></tr></thead>
          <tbody>{items.map(c => <tr key={c.id}>
            <td><b>{c.name}</b>{c.description && <div className="muted" style={{ fontSize: 12.5 }}>{c.description}</div>}</td>
            <td>{c.products_count ?? 0}</td>
            <td><Badge tone={c.is_active ? 'ok' : 'warn'}>{c.is_active ? 'Visible' : 'Hidden'}</Badge></td>
            <td><div className="vp-row-actions">
              <button className="btn sm icon" style={{ width: 32 }} disabled={!canEdit} onClick={() => void toggle(c)} aria-label={c.is_active ? `Hide ${c.name}` : `Show ${c.name}`} title={c.is_active ? 'Hide' : 'Show'}>{c.is_active ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              <button className="btn sm icon" style={{ width: 32 }} disabled={!canEdit} onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><Pencil size={14} /></button>
              <button className="btn sm icon danger" style={{ width: 32 }} disabled={!canEdit} onClick={() => setRemoving(c)} aria-label={`Delete ${c.name}`}><Trash2 size={14} /></button>
            </div></td>
          </tr>)}</tbody>
        </table></div>}
    </Card>

    <Drawer open={!!editing} title={category ? `Edit “${category.name}”` : 'Add category'} onClose={() => setEditing(null)} footer={<><button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button><button form="cat-form" className="btn primary" disabled={busy}>{busy ? <><Spinner />Saving…</> : 'Save category'}</button></>}>
      {editing && <form id="cat-form" key={category?.id ?? 'new'} className="form-grid" onSubmit={save}>
        <div className="form-field form-wide"><label htmlFor="c-name">Name</label><input id="c-name" name="name" defaultValue={category?.name} maxLength={120} required placeholder="e.g. Gel pens" /></div>
        <div className="form-field form-wide"><label htmlFor="c-desc">Description <span className="muted">(optional)</span></label><textarea id="c-desc" name="description" defaultValue={category?.description ?? ''} maxLength={500} placeholder="A short description" /></div>
      </form>}
    </Drawer>
    <ConfirmDialog open={!!removing} danger title="Delete this category?" message={used > 0 ? `“${removing?.name}” will be deleted and its ${used} product${used === 1 ? '' : 's'} will become uncategorized.` : `“${removing?.name ?? ''}” will be deleted.`} confirmLabel="Delete category" busy={busy} onCancel={() => setRemoving(null)} onConfirm={() => void remove()} />
  </>;
}
