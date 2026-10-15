'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, type ApiData } from '@/lib/api';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from './toast';
import { useVendorSession } from './vendor-shell';

export type VendorCategory = { id: number; name: string; slug: string; description?: string | null; is_active: boolean; products_count?: number };

/** Lets a store owner/manager create and maintain the store's own product categories. Staff can view only. */
export function VendorCategories() {
  const session = useVendorSession();
  const toast = useToast();
  const vendor = session?.vendor;
  const canEdit = ['owner', 'manager'].includes(session?.role ?? '') && vendor?.status === 'active';
  const [items, setItems] = useState<VendorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<VendorCategory | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    if (!vendor) return;
    try {
      const res = await apiFetch<ApiData<VendorCategory[]>>(`/v1/vendor/${vendor.slug}/categories`);
      setItems(res.data);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  }, [vendor]);
  useEffect(() => { void load(); }, [load]);

  function reset() { setEditing(null); setName(''); setDescription(''); }
  function startEdit(category: VendorCategory) { setEditing(category); setName(category.name); setDescription(category.description ?? ''); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!vendor) return;
    setBusy(true);
    setError('');
    try {
      const body = JSON.stringify({ name: name.trim(), description: description.trim() || null });
      await apiFetch(`/v1/vendor/${vendor.slug}/categories${editing ? `/${editing.id}` : ''}`, { method: editing ? 'PUT' : 'POST', body });
      toast.success(editing ? 'Category updated.' : 'Category added.');
      reset();
      await load();
    } catch (cause) {
      const message = friendlyMessage(cause, 'Could not save the category.');
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(category: VendorCategory) {
    if (!vendor) return;
    try {
      await apiFetch(`/v1/vendor/${vendor.slug}/categories/${category.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !category.is_active }) });
      toast.success(category.is_active ? 'Category hidden from your store.' : 'Category is visible again.');
      await load();
    } catch (cause) {
      const message = friendlyMessage(cause, 'Could not update the category.');
      setError(message);
      toast.error(message);
    }
  }

  async function remove(category: VendorCategory) {
    if (!vendor) return;
    const used = category.products_count ?? 0;
    const message = used > 0 ? `Delete “${category.name}”? Its ${used} product${used === 1 ? '' : 's'} will become uncategorized.` : `Delete “${category.name}”?`;
    if (!window.confirm(message)) return;
    try {
      await apiFetch(`/v1/vendor/${vendor.slug}/categories/${category.id}`, { method: 'DELETE' });
      if (editing?.id === category.id) reset();
      toast.success('Category deleted.');
      await load();
    } catch (cause) {
      const message = friendlyMessage(cause, 'Could not delete the category.');
      setError(message);
      toast.error(message);
    }
  }

  return <div className="dashboard-wrap">
    <div className="dashboard-heading"><div><span className="eyebrow">Vendor workspace</span><h1>Categories</h1><p>Group your products your own way. These categories belong to your store only.</p></div></div>
    {error && <div className="notice" role="alert">{error}</div>}
    {vendor && vendor.status !== 'active' && <div className="notice">Categories can be added once your store is approved.</div>}
    {canEdit && <div className="panel">
      <h2 className="panel-title">{editing ? `Edit “${editing.name}”` : 'Add a category'}</h2>
      <form className="form-grid" onSubmit={save}>
        <div className="form-field"><label htmlFor="cat-name">Name</label><input id="cat-name" value={name} onChange={e => setName(e.target.value)} maxLength={120} required placeholder="e.g. Gel pens" /></div>
        <div className="form-field"><label htmlFor="cat-desc">Description (optional)</label><input id="cat-desc" value={description} onChange={e => setDescription(e.target.value)} maxLength={500} placeholder="Short description" /></div>
        <div className="form-wide">
          <button className="button-primary" disabled={busy || !name.trim()}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add category'}</button>{' '}
          {editing && <button type="button" className="button-secondary" onClick={reset}>Cancel</button>}
        </div>
      </form>
    </div>}
    <div className="panel">
      <h2 className="panel-title">Your categories</h2>
      {loading ? <div className="empty-products" role="status">Loading categories…</div>
        : items.length === 0 ? <div className="empty-products">No categories yet.{canEdit ? ' Add your first one above, then pick it when you add a product.' : ''}</div>
        : <div className="table-scroll"><table>
          <thead><tr><th>Name</th><th>Products</th><th>Status</th>{canEdit && <th>Actions</th>}</tr></thead>
          <tbody>{items.map(category => <tr key={category.id}>
            <td><b>{category.name}</b>{category.description && <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{category.description}</div>}</td>
            <td>{category.products_count ?? 0}</td>
            <td><span className={category.is_active ? 'status' : 'status pending'}>{category.is_active ? 'Active' : 'Hidden'}</span></td>
            {canEdit && <td><button className="button-secondary" onClick={() => startEdit(category)}>Edit</button>{' '}<button className="button-secondary" onClick={() => void toggle(category)}>{category.is_active ? 'Hide' : 'Show'}</button>{' '}<button className="button-secondary" onClick={() => void remove(category)}>Delete</button></td>}
          </tr>)}</tbody>
        </table></div>}
    </div>
  </div>;
}
