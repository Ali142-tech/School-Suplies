'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { apiFetch, ApiError, type ApiData } from '@/lib/api';
import { HEX, URL_HINT, isSafeUrl, roleCanWrite, textProblem } from '@/lib/cms';
import { useUnsavedGuard } from './cms/use-unsaved-guard';
import { useVendorSession } from './vendor-shell';

type Link = { label: string; url: string };
type Remote = { brand_color?: string | null; logo_url?: string | null; settings?: { accent_color?: string; navigation?: Link[]; footer?: { text?: string; links?: Link[] }; seo?: { title?: string; description?: string } } | null };

function LinkList({ title, hint, links, onChange, disabled, errors, prefix }: { title: string; hint: string; links: Link[]; onChange: (l: Link[]) => void; disabled: boolean; errors: Record<string, string>; prefix: string }) {
  const set = (i: number, patch: Partial<Link>) => onChange(links.map((l, n) => n === i ? { ...l, ...patch } : l));
  const swap = (i: number, d: -1 | 1) => { const next = [...links]; [next[i], next[i + d]] = [next[i + d], next[i]]; onChange(next); };
  return <div className="panel"><h2 className="panel-title">{title}</h2><p className="muted">{hint}</p>
    {!links.length && <div className="empty-products">No links yet.</div>}
    <ol className="cms-blocks">{links.map((link, i) => <li className="cms-block-card" key={i}><div className="cms-block-body form-grid">
      <div className={`form-field${errors[`${prefix}.${i}.label`] ? ' has-error' : ''}`}><label htmlFor={`${prefix}-l-${i}`}>Label</label><input id={`${prefix}-l-${i}`} value={link.label} maxLength={40} disabled={disabled} onChange={e => set(i, { label: e.target.value })} />{errors[`${prefix}.${i}.label`] && <small className="cms-error" role="alert">{errors[`${prefix}.${i}.label`]}</small>}</div>
      <div className={`form-field${errors[`${prefix}.${i}.url`] ? ' has-error' : ''}`}><label htmlFor={`${prefix}-u-${i}`}>Link</label><input id={`${prefix}-u-${i}`} value={link.url} maxLength={2048} placeholder="/about-us" disabled={disabled} onChange={e => set(i, { url: e.target.value })} />{errors[`${prefix}.${i}.url`] ? <small className="cms-error" role="alert">{errors[`${prefix}.${i}.url`]}</small> : <small className="muted">{URL_HINT}</small>}</div>
      {!disabled && <div className="form-wide cms-actions">
        <button type="button" className="cms-tool" onClick={() => swap(i, -1)} disabled={i === 0} aria-label={`Move ${title} link ${i + 1} up`}><ArrowUp size={15} /></button>
        <button type="button" className="cms-tool" onClick={() => swap(i, 1)} disabled={i === links.length - 1} aria-label={`Move ${title} link ${i + 1} down`}><ArrowDown size={15} /></button>
        <button type="button" className="cms-tool cms-delete" onClick={() => onChange(links.filter((_, n) => n !== i))} aria-label={`Remove ${title} link ${i + 1}`}><Trash2 size={15} /></button>
      </div>}
    </div></li>)}</ol>
    {!disabled && <button type="button" className="button-secondary" onClick={() => onChange([...links, { label: '', url: '' }])} disabled={links.length >= 10}><Plus size={14} /> Add link{links.length >= 10 ? ' (maximum 10)' : ''}</button>}
  </div>;
}

export function VendorWebsiteSettings() {
  const session = useVendorSession();
  const vendor = session?.vendor;
  const canWrite = roleCanWrite(session?.role, vendor?.status);
  const [loaded, setLoaded] = useState(false);
  const [brand, setBrand] = useState('#2f62d3'); const [accent, setAccent] = useState('#f59e0b');
  const [nav, setNav] = useState<Link[]>([]); const [footerText, setFooterText] = useState(''); const [footerLinks, setFooterLinks] = useState<Link[]>([]);
  const [seoTitle, setSeoTitle] = useState(''); const [seoDesc, setSeoDesc] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null); const [logoFile, setLogoFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  // Dirty = current form values differ from the values last loaded or saved.
  const snap = (logo: string | null) => JSON.stringify({ brand, accent, nav, footerText, footerLinks, seoTitle, seoDesc, logo });
  const [baseline, setBaseline] = useState<string | null>(null);
  // Runs once, on the first render after the data arrived (it only acts while no baseline exists, so it cannot loop).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (loaded && baseline === null) setBaseline(snap(null)); }, [loaded, baseline]);
  const leaveGuard = useUnsavedGuard(canWrite && baseline !== null && snap(logoFile?.name ?? null) !== baseline);

  useEffect(() => {
    if (!vendor) return;
    let live = true;
    apiFetch<ApiData<Remote>>(`/v1/vendor/${vendor.slug}/settings`).then(({ data }) => {
      if (!live) return;
      const s = data.settings ?? {};
      if (data.brand_color) setBrand(data.brand_color);
      if (s.accent_color) setAccent(s.accent_color);
      setNav(s.navigation ?? []); setFooterText(s.footer?.text ?? ''); setFooterLinks(s.footer?.links ?? []);
      setSeoTitle(s.seo?.title ?? ''); setSeoDesc(s.seo?.description ?? ''); setLogoUrl(data.logo_url ?? null); setLoaded(true);
    }).catch(cause => { if (live) { setError(cause instanceof Error ? cause.message : 'Could not load website settings.'); setLoaded(true); } });
    return () => { live = false; };
  }, [vendor]);

  function validate() {
    const e: Record<string, string> = {};
    if (!HEX.test(brand)) e.brand = 'Choose a valid colour.'; if (!HEX.test(accent)) e.accent = 'Choose a valid colour.';
    const links = (list: Link[], prefix: string) => list.forEach((l, i) => {
      const lp = textProblem(l.label, 'Label', 40, true); if (lp) e[`${prefix}.${i}.label`] = lp;
      if (!l.url.trim()) e[`${prefix}.${i}.url`] = 'Link is required.'; else if (!isSafeUrl(l.url)) e[`${prefix}.${i}.url`] = `This link is not allowed. ${URL_HINT}`;
    });
    links(nav, 'navigation'); links(footerLinks, 'footer.links');
    const ft = textProblem(footerText, 'Footer text', 500); if (ft) e.footerText = ft;
    const st = textProblem(seoTitle, 'SEO title', 70); if (st) e.seoTitle = st;
    const sd = textProblem(seoDesc, 'Meta description', 170); if (sd) e.seoDesc = sd;
    if (logoFile && !['image/jpeg', 'image/png', 'image/webp'].includes(logoFile.type)) e.logo = 'Use a JPG, PNG or WebP image.';
    if (logoFile && logoFile.size > 2 * 1024 * 1024) e.logo = 'The logo must be 2 MB or smaller.';
    return e;
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!vendor) return;
    setMessage(''); setError('');
    const found = validate(); setErrors(found);
    if (Object.keys(found).length) { setError('Please fix the highlighted problems.'); return; }
    setBusy(true);
    try {
      // Only the CMS keys are sent; the server merges them with existing settings (e.g. the store description).
      const result = await apiFetch<ApiData<Remote>>(`/v1/vendor/${vendor.slug}/settings`, { method: 'PUT', body: JSON.stringify({
        brand_color: brand,
        settings: { accent_color: accent, navigation: nav.map(l => ({ label: l.label.trim(), url: l.url.trim() })), footer: { text: footerText.trim() || null, links: footerLinks.map(l => ({ label: l.label.trim(), url: l.url.trim() })) }, seo: { title: seoTitle.trim() || null, description: seoDesc.trim() || null } },
      }) });
      setLogoUrl(result.data.logo_url ?? null);
      if (logoFile) {
        // PHP does not parse multipart bodies on PUT, so the file is sent as a POST that Laravel treats as PUT.
        const body = new FormData(); body.append('logo', logoFile); body.append('_method', 'PUT');
        const withLogo = await apiFetch<ApiData<Remote>>(`/v1/vendor/${vendor.slug}/settings`, { method: 'POST', body });
        setLogoUrl(withLogo.data.logo_url ?? null); setLogoFile(null);
      }
      setBaseline(snap(null)); setMessage('Website settings saved.');
    } catch (cause) {
      const details = cause instanceof ApiError && cause.details && typeof cause.details === 'object' ? cause.details as Record<string, string[]> : {};
      const mapped: Record<string, string> = {};
      for (const [key, value] of Object.entries(details)) { const k = key.replace(/^settings\./, ''); mapped[k === 'brand_color' ? 'brand' : k === 'accent_color' ? 'accent' : k === 'footer.text' ? 'footerText' : k === 'seo.title' ? 'seoTitle' : k === 'seo.description' ? 'seoDesc' : k] = Array.isArray(value) ? value[0] : String(value); }
      setErrors(mapped); setError(cause instanceof Error ? cause.message : 'Could not save website settings.');
    } finally { setBusy(false); }
  }

  const disabled = !canWrite;
  return <div className="dashboard-wrap">
    <div className="dashboard-heading"><div><span className="eyebrow">Website</span><h1>Website settings</h1><p>Your logo, colours, menus, footer and search-engine defaults.</p></div></div>
    {leaveGuard}
    {vendor?.status !== 'active' && <div className="notice" role="status">Your store is {vendor?.status}. Website settings are read-only until your store is approved.</div>}
    {vendor?.status === 'active' && !canWrite && <div className="notice" role="status">You have view-only access. Ask a store owner or manager to make changes.</div>}
    {message && <div className="notice cms-success" role="status">{message}</div>}
    {error && <div className="notice" role="alert">{error}</div>}
    {!loaded ? <div className="empty-products" role="status">Loading settings…</div> : <form onSubmit={save} noValidate>
      <div className="panel form-grid"><h2 className="panel-title form-wide">Brand</h2>
        <div className={`form-field form-wide${errors.logo ? ' has-error' : ''}`}><label htmlFor="ws-logo">Logo</label>
          <div className="cms-image-pick">
            {logoUrl
              // eslint-disable-next-line @next/next/no-img-element -- storage URL from the API
              ? <img src={logoUrl} alt="Current logo" className="cms-thumb" />
              : <div className="cms-thumb empty" aria-hidden="true">No logo</div>}
            <div><input id="ws-logo" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={e => setLogoFile(e.target.files?.[0] ?? null)} /><small className="muted"> JPG, PNG or WebP, up to 2 MB. {logoFile ? `Selected: ${logoFile.name}` : ''}</small></div>
          </div>{errors.logo && <small className="cms-error" role="alert">{errors.logo}</small>}</div>
        <div className={`form-field${errors.brand ? ' has-error' : ''}`}><label htmlFor="ws-brand">Brand colour</label><div className="cms-color"><input id="ws-brand" type="color" value={HEX.test(brand) ? brand : '#000000'} disabled={disabled} onChange={e => setBrand(e.target.value)} /><code>{brand}</code></div>{errors.brand && <small className="cms-error">{errors.brand}</small>}</div>
        <div className={`form-field${errors.accent ? ' has-error' : ''}`}><label htmlFor="ws-accent">Accent colour</label><div className="cms-color"><input id="ws-accent" type="color" value={HEX.test(accent) ? accent : '#000000'} disabled={disabled} onChange={e => setAccent(e.target.value)} /><code>{accent}</code></div>{errors.accent && <small className="cms-error">{errors.accent}</small>}</div>
      </div>
      <LinkList title="Navigation menu" hint="The links shown in your website header, in this order." links={nav} onChange={setNav} disabled={disabled} errors={errors} prefix="navigation" />
      <div className="panel form-grid"><h2 className="panel-title form-wide">Footer</h2>
        <div className={`form-field form-wide${errors.footerText ? ' has-error' : ''}`}><label htmlFor="ws-footer">Footer text</label><textarea id="ws-footer" rows={3} maxLength={500} value={footerText} disabled={disabled} onChange={e => setFooterText(e.target.value)} /><small className="muted cms-count">{footerText.length}/500</small>{errors.footerText && <small className="cms-error">{errors.footerText}</small>}</div>
      </div>
      <LinkList title="Footer links" hint="Extra links shown in your website footer." links={footerLinks} onChange={setFooterLinks} disabled={disabled} errors={errors} prefix="footer.links" />
      <div className="panel form-grid"><h2 className="panel-title form-wide">Search engines (SEO defaults)</h2>
        <div className={`form-field form-wide${errors.seoTitle ? ' has-error' : ''}`}><label htmlFor="ws-seo-title">Default SEO title</label><input id="ws-seo-title" maxLength={70} value={seoTitle} disabled={disabled} onChange={e => setSeoTitle(e.target.value)} /><small className="muted cms-count">{seoTitle.length}/70</small>{errors.seoTitle && <small className="cms-error">{errors.seoTitle}</small>}</div>
        <div className={`form-field form-wide${errors.seoDesc ? ' has-error' : ''}`}><label htmlFor="ws-seo-desc">Default meta description</label><textarea id="ws-seo-desc" rows={3} maxLength={170} value={seoDesc} disabled={disabled} onChange={e => setSeoDesc(e.target.value)} /><small className="muted cms-count">{seoDesc.length}/170</small>{errors.seoDesc && <small className="cms-error">{errors.seoDesc}</small>}</div>
      </div>
      {canWrite && <div style={{ marginTop: 17 }}><button className="button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save website settings'}</button></div>}
    </form>}
  </div>;
}
