'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Eye, FilePlus2, Pencil, Trash2 } from 'lucide-react';
import { apiFetch, ApiError, type ApiData } from '@/lib/api';
import { formatDate, mapApiErrors, roleCanWrite, slugify, type PageSummary } from '@/lib/cms';
import { ConfirmDialog } from './cms/confirm-dialog';
import { useVendorSession } from './vendor-shell';

export function StatusBadge({ page }: { page: Pick<PageSummary, 'status' | 'has_unpublished_changes'> }) {
  const label = page.status === 'published' ? 'Published' : page.status === 'unpublished' ? 'Unpublished' : 'Draft';
  return <span className="cms-status-wrap"><span className={`cms-status ${page.status}`}>{label}</span>{page.has_unpublished_changes && <span className="cms-status changes" title="The live page is older than your saved draft">Unpublished changes</span>}</span>;
}

export function VendorPages() {
  const session = useVendorSession();
  const router = useRouter();
  const vendor = session?.vendor;
  const canWrite = roleCanWrite(session?.role, vendor?.status);
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{ kind: 'delete' | 'unpublish'; page: PageSummary } | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState(''); const [slug, setSlug] = useState(''); const [slugTouched, setSlugTouched] = useState(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({}); const [createBusy, setCreateBusy] = useState(false);

  const load = useCallback(async () => {
    if (!vendor) return;
    try { setPages((await apiFetch<ApiData<PageSummary[]>>(`/v1/vendor/${vendor.slug}/pages`)).data); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load pages.'); } finally { setLoaded(true); }
  }, [vendor]);
  useEffect(() => { void load(); }, [load]);

  async function create(event: React.FormEvent) {
    event.preventDefault(); if (!vendor) return;
    setCreateBusy(true); setCreateErrors({});
    try {
      const result = await apiFetch<ApiData<PageSummary>>(`/v1/vendor/${vendor.slug}/pages`, { method: 'POST', body: JSON.stringify({ title, slug: slug || slugify(title), blocks: [] }) });
      router.push(`/vendor/pages/${result.data.id}`);
    } catch (cause) {
      const mapped = cause instanceof ApiError ? mapApiErrors(cause.details).page : {};
      setCreateErrors(Object.keys(mapped).length ? mapped : { title: cause instanceof Error ? cause.message : 'Could not create the page.' });
    } finally { setCreateBusy(false); }
  }

  async function act(kind: 'publish' | 'unpublish' | 'delete', page: PageSummary) {
    if (!vendor) return;
    setBusyId(page.id); setError(''); setMessage('');
    try {
      const path = `/v1/vendor/${vendor.slug}/pages/${page.id}`;
      if (kind === 'delete') await apiFetch(path, { method: 'DELETE' });
      else await apiFetch(`${path}/${kind}`, { method: 'POST' });
      await load();
      setMessage(kind === 'publish' ? `“${page.title}” is now live.` : kind === 'unpublish' ? `“${page.title}” is no longer public.` : `“${page.title}” was deleted.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The action failed.'); } finally { setBusyId(null); setDialog(null); }
  }

  const defaults = pages.filter(p => p.is_default);
  const custom = pages.filter(p => !p.is_default);

  const row = (page: PageSummary) => <tr key={page.id}>
    <td data-label="Page"><b>{page.title}</b></td>
    <td data-label="Address"><code className="cms-path">{page.public_path}</code></td>
    <td data-label="Status"><StatusBadge page={page} /></td>
    <td data-label="Last updated">{formatDate(page.updated_at)}{page.updated_by && <><br /><span className="muted">by {page.updated_by}</span></>}</td>
    <td data-label="Actions"><div className="cms-actions">
      <Link className="button-secondary" href={`/vendor/pages/${page.id}`}><Pencil size={14} />{canWrite ? 'Edit' : 'View'}</Link>
      <Link className="button-secondary" href={`/vendor/pages/${page.id}/preview`}><Eye size={14} />Preview</Link>
      {canWrite && (page.status === 'published'
        ? <button className="button-secondary" disabled={busyId === page.id} onClick={() => setDialog({ kind: 'unpublish', page })}>Unpublish</button>
        : <button className="button-primary" disabled={busyId === page.id} onClick={() => void act('publish', page)}>Publish</button>)}
      {canWrite && page.is_deletable && <button className="button-secondary cms-delete" disabled={busyId === page.id} onClick={() => setDialog({ kind: 'delete', page })} aria-label={`Delete ${page.title}`}><Trash2 size={14} />Delete</button>}
    </div></td>
  </tr>;

  const table = (rows: PageSummary[]) => <div className="table-scroll"><table className="cms-table"><thead><tr><th>Page</th><th>Address</th><th>Status</th><th>Last updated</th><th>Actions</th></tr></thead><tbody>{rows.map(row)}</tbody></table></div>;

  return <div className="dashboard-wrap">
    <div className="dashboard-heading"><div><span className="eyebrow">Website</span><h1>Pages</h1><p>Build and publish the pages of your store website. Only published pages are visible to visitors.</p></div>
      {canWrite && <button className="button-primary" onClick={() => setCreating(v => !v)} aria-expanded={creating}><FilePlus2 size={15} /> New page</button>}</div>
    {vendor?.status !== 'active' && <div className="notice" role="status">Your store is {vendor?.status}. You can look around, but pages can only be created or edited once your store is approved.</div>}
    {vendor?.status === 'active' && !canWrite && <div className="notice" role="status">You have view-only access. Ask a store owner or manager to make changes.</div>}
    {error && <div className="notice" role="alert">{error}</div>}
    {message && <div className="notice cms-success" role="status">{message}</div>}

    {creating && canWrite && <form className="panel form-grid" onSubmit={create} noValidate>
      <h2 className="panel-title form-wide">Create a custom page</h2>
      <div className={`form-field${createErrors.title ? ' has-error' : ''}`}><label htmlFor="np-title">Page title</label><input id="np-title" value={title} maxLength={120} required onChange={e => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />{createErrors.title && <small className="cms-error" role="alert">{createErrors.title}</small>}</div>
      <div className={`form-field${createErrors.slug ? ' has-error' : ''}`}><label htmlFor="np-slug">Web address</label><input id="np-slug" value={slug} maxLength={80} required pattern="[a-z0-9]+(-[a-z0-9]+)*" onChange={e => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} /><small className="muted">Your page will be at /{slug || 'your-page'}</small>{createErrors.slug && <small className="cms-error" role="alert">{createErrors.slug}</small>}</div>
      <div className="form-wide"><button className="button-primary" disabled={createBusy || !title.trim() || !slug}>{createBusy ? 'Creating…' : 'Create and start editing'}</button> <button type="button" className="button-secondary" onClick={() => setCreating(false)}>Cancel</button></div>
    </form>}

    <div className="panel"><h2 className="panel-title">Main pages</h2>
      {!loaded ? <div className="empty-products" role="status">Loading pages…</div> : !defaults.length ? <div className="empty-products">{vendor?.status === 'active' ? 'No pages yet.' : 'Your main pages will appear here after your store is approved.'}</div> : table(defaults)}
    </div>
    <div className="panel"><h2 className="panel-title">Custom pages</h2>
      {!loaded ? null : !custom.length ? <div className="empty-products">{canWrite ? 'You have no custom pages yet. Use “New page” to add one — for example a gallery, FAQ or pricing page.' : 'There are no custom pages.'}</div> : table(custom)}
    </div>

    <ConfirmDialog open={dialog?.kind === 'delete'} danger title="Delete this page?" message={`“${dialog?.page.title ?? ''}” and its draft will be permanently deleted. This cannot be undone.`} confirmLabel="Delete page" busy={busyId !== null} onCancel={() => setDialog(null)} onConfirm={() => dialog && void act('delete', dialog.page)} />
    <ConfirmDialog open={dialog?.kind === 'unpublish'} title="Unpublish this page?" message={`“${dialog?.page.title ?? ''}” will no longer be visible to visitors. Your content is kept and you can publish it again at any time.`} confirmLabel="Unpublish" busy={busyId !== null} onCancel={() => setDialog(null)} onConfirm={() => dialog && void act('unpublish', dialog.page)} />
  </div>;
}
