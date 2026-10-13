'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Monitor, Pencil, Smartphone } from 'lucide-react';
import { apiFetch, ApiError, type ApiData } from '@/lib/api';
import type { PreviewPage } from '@/lib/cms';
import { BlockRenderer } from './cms/block-renderer';
import { useVendorSession } from './vendor-shell';

type SiteColors = { brand_color?: string | null; settings?: { accent_color?: string | null } | null };

/** Authenticated preview: loads the saved *draft* through the member-only endpoint and renders it with the same BlockRenderer as the public site. */
export function VendorPagePreview() {
  const { id } = useParams<{ id: string }>();
  const vendor = useVendorSession()?.vendor;
  const [page, setPage] = useState<PreviewPage | null>(null);
  const [colors, setColors] = useState<SiteColors>({});
  const [error, setError] = useState('');
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (!vendor) return;
    let live = true;
    Promise.all([
      apiFetch<ApiData<PreviewPage>>(`/v1/vendor/${vendor.slug}/pages/${id}/preview`),
      apiFetch<ApiData<SiteColors>>(`/v1/vendor/${vendor.slug}/settings`).catch(() => ({ data: {} as SiteColors })),
    ]).then(([p, s]) => { if (live) { setPage(p.data); setColors(s.data); } })
      .catch(cause => { if (live) setError(cause instanceof ApiError && cause.status === 404 ? 'This page was not found in your store.' : cause instanceof Error ? cause.message : 'Could not load the preview.'); });
    return () => { live = false; };
  }, [vendor, id]);

  if (error) return <div className="dashboard-wrap"><div className="notice" role="alert">{error}</div><Link className="button-secondary" href="/vendor/pages"><ArrowLeft size={14} /> Back to pages</Link></div>;
  if (!page) return <div className="empty-products" role="status">Loading preview…</div>;

  return <div className="dashboard-wrap">
    <div className="cms-preview-bar" role="status">
      <div><b>Preview</b> — your saved draft{page.status === 'published' ? ' (the live page may differ until you publish)' : ' — not visible to the public'}.</div>
      <div className="cms-actions">
        <button className={`button-secondary${!mobile ? ' cms-on' : ''}`} onClick={() => setMobile(false)} aria-pressed={!mobile}><Monitor size={14} /> Desktop</button>
        <button className={`button-secondary${mobile ? ' cms-on' : ''}`} onClick={() => setMobile(true)} aria-pressed={mobile}><Smartphone size={14} /> Mobile</button>
        <Link className="button-primary" href={`/vendor/pages/${id}`}><Pencil size={14} /> Back to editor</Link>
      </div>
    </div>
    <div className={`cms-preview-frame${mobile ? ' mobile' : ''}`}>
      {page.blocks.length ? <BlockRenderer blocks={page.blocks} brandColor={colors.brand_color} accentColor={colors.settings?.accent_color} /> : <div className="empty-products">This page has no content blocks yet.</div>}
    </div>
  </div>;
}
