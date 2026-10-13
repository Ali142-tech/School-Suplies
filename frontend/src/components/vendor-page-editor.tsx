'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, ChevronRight, Eye, Plus, Save, Trash2 } from 'lucide-react';
import { apiFetch, ApiError, type ApiData } from '@/lib/api';
import {
  BLOCK_TYPES, MAX_BLOCKS, blockLabel, formatDate, mapApiErrors, newBlock, roleCanWrite, serializeBlocks, textProblem, validateBlocks,
  type Block, type BlockType, type FieldErrors, type PageDetail,
} from '@/lib/cms';
import { BlockForm } from './cms/block-forms';
import { ConfirmDialog } from './cms/confirm-dialog';
import { useUnsavedGuard } from './cms/use-unsaved-guard';
import { StatusBadge } from './vendor-pages';
import { useVendorSession } from './vendor-shell';

const summary = (b: Block) => b.heading || b.button_label || b.items?.[0]?.title || b.caption || b.email || b.phone || b.address || (b.body ? b.body.slice(0, 60) : '') || '';

export function VendorPageEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = useVendorSession();
  const vendor = session?.vendor;
  const canWrite = roleCanWrite(session?.role, vendor?.status);

  const [page, setPage] = useState<PageDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [title, setTitle] = useState(''); const [slug, setSlug] = useState('');
  const [seoTitle, setSeoTitle] = useState(''); const [meta, setMeta] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pageErrors, setPageErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<'' | 'save' | 'publish' | 'unpublish' | 'delete' | 'preview'>('');
  const [dialog, setDialog] = useState<'' | 'unpublish' | 'delete'>('');
  const [announce, setAnnounce] = useState('');
  const errorSummary = useRef<HTMLDivElement>(null);

  const apply = useCallback((data: PageDetail) => {
    setPage(data); setTitle(data.title); setSlug(data.slug); setSeoTitle(data.seo_title ?? ''); setMeta(data.meta_description ?? '');
    setBlocks(data.blocks); setDirty(false);
  }, []);

  useEffect(() => {
    if (!vendor) return;
    let live = true;
    apiFetch<ApiData<PageDetail>>(`/v1/vendor/${vendor.slug}/pages/${id}`)
      .then(r => { if (live) { apply(r.data); setOpen(new Set(r.data.blocks.length <= 3 ? r.data.blocks.map(b => b.id) : [])); } })
      .catch(cause => { if (live) setLoadError(cause instanceof ApiError && cause.status === 404 ? 'This page was not found in your store.' : cause instanceof Error ? cause.message : 'Could not load the page.'); });
    return () => { live = false; };
  }, [vendor, id, apply]);

  const leaveGuard = useUnsavedGuard(dirty && canWrite);

  const touch = () => { setDirty(true); setMessage(''); };
  const patchBlock = (index: number, patch: Partial<Block>) => { setBlocks(list => list.map((b, i) => i === index ? { ...b, ...patch } : b)); touch(); };
  const toggle = (blockId: string) => setOpen(prev => { const next = new Set(prev); if (next.has(blockId)) next.delete(blockId); else next.add(blockId); return next; });

  function move(index: number, delta: -1 | 1) {
    const target = index + delta; if (target < 0 || target >= blocks.length) return;
    setBlocks(list => { const next = [...list]; [next[index], next[target]] = [next[target], next[index]]; return next; });
    setAnnounce(`${blockLabel(blocks[index].type)} moved to position ${target + 1} of ${blocks.length}.`); touch();
  }
  function remove(index: number) {
    const removed = blocks[index]; setBlocks(list => list.filter((_, i) => i !== index)); setFieldErrors({});
    setAnnounce(`${blockLabel(removed.type)} removed.`); touch();
  }
  function add(type: BlockType) {
    if (blocks.length >= MAX_BLOCKS) return;
    const block = newBlock(type); setBlocks(list => [...list, block]); setOpen(prev => new Set(prev).add(block.id));
    setAnnounce(`${blockLabel(type)} added at position ${blocks.length + 1}.`); touch();
  }

  const problems = useMemo(() => Object.keys(fieldErrors).length + Object.keys(pageErrors).length, [fieldErrors, pageErrors]);

  function validateAll(): boolean {
    const fields = validateBlocks(blocks); const pageProblems: Record<string, string> = {};
    const t = textProblem(title, 'Title', 120, true); if (t) pageProblems.title = t;
    if (page && !page.is_default && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) pageProblems.slug = 'Use lowercase letters, numbers and single hyphens.';
    const st = textProblem(seoTitle, 'SEO title', 70); if (st) pageProblems.seo_title = st;
    const md = textProblem(meta, 'Meta description', 170); if (md) pageProblems.meta_description = md;
    if (blocks.length > MAX_BLOCKS) pageProblems.blocks = `A page can have at most ${MAX_BLOCKS} blocks.`;
    showErrors(fields, pageProblems);
    return !Object.keys(fields).length && !Object.keys(pageProblems).length;
  }

  function showErrors(fields: FieldErrors, pageProblems: Record<string, string>) {
    setFieldErrors(fields); setPageErrors(pageProblems);
    if (Object.keys(fields).length || Object.keys(pageProblems).length) {
      setOpen(prev => { const next = new Set(prev); Object.keys(fields).forEach(k => { const b = blocks[Number(k.split('.')[0])]; if (b) next.add(b.id); }); return next; });
      requestAnimationFrame(() => errorSummary.current?.focus());
    }
  }

  async function persist(): Promise<PageDetail | null> {
    if (!vendor || !page) return null;
    if (!validateAll()) { setError('Please fix the highlighted problems before continuing.'); return null; }
    setError('');
    try {
      const body: Record<string, unknown> = { title: title.trim(), seo_title: seoTitle.trim() || null, meta_description: meta.trim() || null, blocks: serializeBlocks(blocks) };
      if (!page.is_default) body.slug = slug;
      const result = await apiFetch<ApiData<PageDetail>>(`/v1/vendor/${vendor.slug}/pages/${page.id}`, { method: 'PUT', body: JSON.stringify(body) });
      apply(result.data);
      return result.data;
    } catch (cause) {
      const mapped = cause instanceof ApiError ? mapApiErrors(cause.details) : { fields: {}, page: {} };
      showErrors(mapped.fields, mapped.page);
      setError(cause instanceof Error ? cause.message : 'Could not save the page.');
      return null;
    }
  }

  async function save() { setBusy('save'); setMessage(''); const saved = await persist(); if (saved) setMessage('Draft saved. Visitors still see the published version.'); setBusy(''); }

  async function publish() {
    if (!vendor || !page) return;
    setBusy('publish'); setMessage('');
    const saved = dirty ? await persist() : page;
    if (saved) {
      try {
        const result = await apiFetch<ApiData<PageDetail>>(`/v1/vendor/${vendor.slug}/pages/${saved.id}/publish`, { method: 'POST' });
        apply(result.data); setMessage('Published. Your page is now live.');
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not publish the page.'); }
    }
    setBusy('');
  }

  async function unpublish() {
    if (!vendor || !page) return;
    setBusy('unpublish');
    try { const result = await apiFetch<ApiData<PageDetail>>(`/v1/vendor/${vendor.slug}/pages/${page.id}/unpublish`, { method: 'POST' }); apply(result.data); setMessage('Unpublished. Visitors can no longer see this page.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not unpublish the page.'); }
    setBusy(''); setDialog('');
  }

  async function destroy() {
    if (!vendor || !page) return;
    setBusy('delete');
    try { await apiFetch(`/v1/vendor/${vendor.slug}/pages/${page.id}`, { method: 'DELETE' }); setDirty(false); router.push('/vendor/pages'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete the page.'); setBusy(''); setDialog(''); }
  }

  async function preview() {
    if (!page) return;
    setBusy('preview');
    if (canWrite && dirty) { const saved = await persist(); if (!saved) { setBusy(''); return; } }
    router.push(`/vendor/pages/${page.id}/preview`);
  }

  if (loadError) return <div className="dashboard-wrap"><div className="notice" role="alert">{loadError}</div><Link className="button-secondary" href="/vendor/pages"><ArrowLeft size={14} /> Back to pages</Link></div>;
  if (!page) return <div className="empty-products" role="status">Loading page…</div>;

  const errorList = [...Object.entries(pageErrors).map(([k, v]) => ({ key: k, text: v })), ...Object.entries(fieldErrors).map(([k, v]) => { const [i] = k.split('.'); return { key: k, text: `Block ${Number(i) + 1} (${blockLabel(blocks[Number(i)]?.type ?? '')}): ${v}` }; })];

  return <div className="dashboard-wrap cms-editor">
    <Link className="cms-back" href="/vendor/pages"><ArrowLeft size={14} /> All pages</Link>
    <div className="dashboard-heading">
      <div><span className="eyebrow">{page.is_default ? 'Main page' : 'Custom page'}</span><h1>{title || page.title}</h1>
        <p><StatusBadge page={page} /> <span className="muted">Last updated {formatDate(page.updated_at)}{page.updated_by ? ` by ${page.updated_by}` : ''}{page.published_at ? ` · Published ${formatDate(page.published_at)}` : ''}</span></p></div>
      <div className="cms-actions">
        <button className="button-secondary" onClick={() => void preview()} disabled={!!busy}><Eye size={14} /> {busy === 'preview' ? 'Opening…' : 'Preview'}</button>
        {canWrite && <button className="button-secondary" onClick={() => void save()} disabled={!!busy || !dirty}><Save size={14} /> {busy === 'save' ? 'Saving…' : 'Save draft'}</button>}
        {canWrite && <button className="button-primary" onClick={() => void publish()} disabled={!!busy || (page.status === 'published' && !dirty && !page.has_unpublished_changes)}>{busy === 'publish' ? 'Publishing…' : page.status === 'published' ? 'Publish changes' : 'Publish'}</button>}
        {canWrite && page.status === 'published' && <button className="button-secondary" onClick={() => setDialog('unpublish')} disabled={!!busy}>Unpublish</button>}
        {canWrite && page.is_deletable && <button className="button-secondary cms-delete" onClick={() => setDialog('delete')} disabled={!!busy}><Trash2 size={14} /> Delete</button>}
      </div>
    </div>

    {vendor?.status !== 'active' && <div className="notice" role="status">Your store is {vendor?.status}. Pages are read-only until your store is approved.</div>}
    {vendor?.status === 'active' && !canWrite && <div className="notice" role="status">You have view-only access to this page.</div>}
    {dirty && canWrite && <div className="notice" role="status">You have unsaved changes.</div>}
    {message && <div className="notice cms-success" role="status">{message}</div>}
    {error && <div className="notice" role="alert">{error}</div>}
    {errorList.length > 0 && <div className="cms-error-summary" role="alert" tabIndex={-1} ref={errorSummary}><b>{problems} {problems === 1 ? 'problem needs' : 'problems need'} your attention:</b><ul>{errorList.map(e => <li key={e.key}>{e.text}</li>)}</ul></div>}
    <div className="cms-sr-only" role="status" aria-live="polite">{announce}</div>

    <div className="cms-fieldset">
      <div className="panel form-grid">
        <h2 className="panel-title form-wide">Page details</h2>
        <div className={`form-field${pageErrors.title ? ' has-error' : ''}`}><label htmlFor="pg-title">Page title</label><input id="pg-title" disabled={!canWrite} value={title} maxLength={120} onChange={e => { setTitle(e.target.value); touch(); }} aria-invalid={!!pageErrors.title} />{pageErrors.title && <small className="cms-error">{pageErrors.title}</small>}</div>
        <div className={`form-field${pageErrors.slug ? ' has-error' : ''}`}><label htmlFor="pg-slug">Web address</label>
          {page.is_default ? <input id="pg-slug" value={page.public_path} readOnly aria-describedby="pg-slug-hint" /> : <input id="pg-slug" disabled={!canWrite} value={slug} maxLength={80} onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')); touch(); }} aria-invalid={!!pageErrors.slug} />}
          <small className="muted" id="pg-slug-hint">{page.is_default ? 'The address of a main page cannot be changed.' : 'Changing the address of a published page changes its public link immediately.'}</small>{pageErrors.slug && <small className="cms-error">{pageErrors.slug}</small>}</div>
        <div className={`form-field${pageErrors.seo_title ? ' has-error' : ''}`}><label htmlFor="pg-seo">SEO title (optional)</label><input id="pg-seo" disabled={!canWrite} value={seoTitle} maxLength={70} onChange={e => { setSeoTitle(e.target.value); touch(); }} /><small className="muted cms-count">{seoTitle.length}/70</small>{pageErrors.seo_title && <small className="cms-error">{pageErrors.seo_title}</small>}</div>
        <div className={`form-field${pageErrors.meta_description ? ' has-error' : ''}`}><label htmlFor="pg-meta">Meta description (optional)</label><input id="pg-meta" disabled={!canWrite} value={meta} maxLength={170} onChange={e => { setMeta(e.target.value); touch(); }} /><small className="muted cms-count">{meta.length}/170</small>{pageErrors.meta_description && <small className="cms-error">{pageErrors.meta_description}</small>}</div>
      </div>

      <div className="panel"><h2 className="panel-title">Content blocks</h2>
        {pageErrors.blocks && <div className="cms-error" role="alert">{pageErrors.blocks}</div>}
        {blocks.length === 0 && <div className="empty-products">This page has no content yet. Add your first block below.</div>}
        <ol className="cms-blocks">
          {blocks.map((block, index) => {
            const isOpen = open.has(block.id); const label = blockLabel(block.type); const hasErrors = Object.keys(fieldErrors).some(k => k.startsWith(`${index}.`));
            return <li key={block.id} className={`cms-block-card${hasErrors ? ' has-error' : ''}`}>
              <div className="cms-block-head">
                <button type="button" className="cms-block-toggle" aria-expanded={isOpen} aria-controls={`panel-${block.id}`} onClick={() => toggle(block.id)}>
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}<span className="cms-block-num">{index + 1}</span><b>{label}</b><span className="muted cms-block-summary">{summary(block)}</span>
                </button>
                {canWrite && <div className="cms-block-tools">
                  <button type="button" className="cms-tool" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move block ${index + 1}, ${label}, up`}><ArrowUp size={15} /></button>
                  <button type="button" className="cms-tool" onClick={() => move(index, 1)} disabled={index === blocks.length - 1} aria-label={`Move block ${index + 1}, ${label}, down`}><ArrowDown size={15} /></button>
                  <button type="button" className="cms-tool cms-delete" onClick={() => remove(index)} aria-label={`Remove block ${index + 1}, ${label}`}><Trash2 size={15} /></button>
                </div>}
              </div>
              {isOpen && <div id={`panel-${block.id}`} className="cms-block-body"><BlockForm block={block} index={index} errors={fieldErrors} disabled={!canWrite} vendorSlug={vendor?.slug ?? ''} onChange={patch => patchBlock(index, patch)} /></div>}
            </li>;
          })}
        </ol>
        {canWrite && <div className="cms-add"><h3>Add a block</h3>
          <div className="cms-add-grid">{BLOCK_TYPES.map(t => <button key={t.type} type="button" className="cms-add-card" onClick={() => add(t.type)} disabled={blocks.length >= MAX_BLOCKS}><Plus size={15} /><b>{t.label}</b><span>{t.description}</span></button>)}</div>
          {blocks.length >= MAX_BLOCKS && <small className="muted">A page can have at most {MAX_BLOCKS} blocks.</small>}
        </div>}
      </div>
    </div>

    {leaveGuard}
    <ConfirmDialog open={dialog === 'unpublish'} title="Unpublish this page?" message="Visitors will no longer be able to see this page. Your content is kept and you can publish it again at any time." confirmLabel="Unpublish" busy={busy === 'unpublish'} onCancel={() => setDialog('')} onConfirm={() => void unpublish()} />
    <ConfirmDialog open={dialog === 'delete'} danger title="Delete this page?" message="This page and its draft will be permanently deleted. This cannot be undone." confirmLabel="Delete page" busy={busy === 'delete'} onCancel={() => setDialog('')} onConfirm={() => void destroy()} />
  </div>;
}
