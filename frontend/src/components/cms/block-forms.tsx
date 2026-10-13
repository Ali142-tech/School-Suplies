'use client';

import { useRef, useState } from 'react';
import { Bold, Italic, Link2, List, ListOrdered, Plus, Trash2 } from 'lucide-react';
import { apiFetch, type ApiData } from '@/lib/api';
import { ICONS, URL_HINT, type Block, type FieldErrors } from '@/lib/cms';

type Patch = (patch: Partial<Block>) => void;
type Common = { block: Block; index: number; errors: FieldErrors; onChange: Patch; disabled: boolean; vendorSlug: string };

function Field({ id, label, hint, error, children, wide = false }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={`form-field${wide ? ' form-wide' : ''}${error ? ' has-error' : ''}`}>
    <label htmlFor={id}>{label}</label>{children}
    {hint && !error && <small className="muted" id={`${id}-hint`}>{hint}</small>}
    {error && <small className="cms-error" id={`${id}-error`} role="alert">{error}</small>}
  </div>;
}

function idFor(c: Common) { return (field: string) => `b-${c.block.id}-${field}`; }
const err = (c: Common, field: string) => c.errors[`${c.index}.${field}`];

function Text({ c, field, label, hint, max, wide, placeholder }: { c: Common; field: keyof Block; label: string; hint?: string; max: number; wide?: boolean; placeholder?: string }) {
  const id = idFor(c)(String(field)); const e = err(c, String(field));
  return <Field id={id} label={label} hint={hint} error={e} wide={wide}>
    <input id={id} value={(c.block[field] as string | undefined) ?? ''} maxLength={max} placeholder={placeholder} disabled={c.disabled} aria-invalid={!!e} aria-describedby={e ? `${id}-error` : hint ? `${id}-hint` : undefined} onChange={ev => c.onChange({ [field]: ev.target.value })} />
  </Field>;
}

function Select({ c, field, label, options }: { c: Common; field: keyof Block; label: string; options: [string, string][] }) {
  const id = idFor(c)(String(field));
  return <Field id={id} label={label} error={err(c, String(field))}>
    <select id={id} value={String(c.block[field] ?? options[0][0])} disabled={c.disabled} onChange={ev => c.onChange({ [field]: field === 'level' ? Number(ev.target.value) : ev.target.value })}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
  </Field>;
}

function Rich({ c, field, label, max }: { c: Common; field: 'body'; label: string; max: number }) {
  const id = idFor(c)(field); const e = err(c, field); const ref = useRef<HTMLTextAreaElement>(null);
  const value = c.block[field] ?? '';
  function apply(kind: 'bold' | 'italic' | 'link' | 'ul' | 'ol') {
    const el = ref.current; if (!el || c.disabled) return;
    const start = el.selectionStart, end = el.selectionEnd, selected = value.slice(start, end);
    let insert = selected, cursorStart = start, cursorEnd = end;
    if (kind === 'bold') { insert = `**${selected || 'bold text'}**`; cursorStart = start + 2; cursorEnd = start + insert.length - 2; }
    if (kind === 'italic') { insert = `*${selected || 'italic text'}*`; cursorStart = start + 1; cursorEnd = start + insert.length - 1; }
    if (kind === 'link') { const text = selected || 'link text'; insert = `[${text}](https://)`; cursorStart = start + text.length + 3; cursorEnd = start + insert.length - 1; }
    if (kind === 'ul' || kind === 'ol') {
      const lines = (selected || 'Item').split('\n'); insert = lines.map((l, i) => `${kind === 'ul' ? '-' : `${i + 1}.`} ${l.replace(/^(-|\d+\.)\s+/, '')}`).join('\n');
      const prefix = start > 0 && value[start - 1] !== '\n' ? '\n' : ''; insert = prefix + insert; cursorStart = start + prefix.length; cursorEnd = start + insert.length;
    }
    c.onChange({ [field]: value.slice(0, start) + insert + value.slice(end) });
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cursorStart, cursorEnd); });
  }
  const tools: [typeof Bold, string, Parameters<typeof apply>[0]][] = [[Bold, 'Bold', 'bold'], [Italic, 'Italic', 'italic'], [Link2, 'Link', 'link'], [List, 'Bulleted list', 'ul'], [ListOrdered, 'Numbered list', 'ol']];
  return <Field id={id} label={label} error={e} wide hint="Formatting: **bold**, *italic*, [link text](https://…), lines starting with “- ” or “1. ” make lists. HTML is not allowed.">
    <div className="cms-toolbar" role="toolbar" aria-label={`${label} formatting`}>{tools.map(([Icon, name, kind]) => <button key={kind} type="button" className="cms-tool" title={name} aria-label={name} disabled={c.disabled} onClick={() => apply(kind)}><Icon size={15} /></button>)}</div>
    <textarea id={id} ref={ref} rows={6} value={value} maxLength={max} disabled={c.disabled} aria-invalid={!!e} aria-describedby={e ? `${id}-error` : `${id}-hint`} onChange={ev => c.onChange({ [field]: ev.target.value })} />
    <small className="muted cms-count">{value.length}/{max}</small>
  </Field>;
}

function ImagePicker({ c, required }: { c: Common; required: boolean }) {
  const id = idFor(c)('image'); const e = err(c, 'image'); const [busy, setBusy] = useState(false); const [problem, setProblem] = useState('');
  async function pick(file: File | undefined) {
    if (!file) return; setProblem('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setProblem('Use a JPG, PNG or WebP image.'); return; }
    if (file.size > 5 * 1024 * 1024) { setProblem('The image must be 5 MB or smaller.'); return; }
    setBusy(true);
    try {
      const body = new FormData(); body.append('image', file);
      const result = await apiFetch<ApiData<{ path: string; url: string }>>(`/v1/vendor/${c.vendorSlug}/media`, { method: 'POST', body });
      c.onChange({ image: result.data.path, image_url: result.data.url });
    } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'Upload failed.'); } finally { setBusy(false); }
  }
  return <Field id={id} label={required ? 'Image' : 'Image (optional)'} error={e || problem} hint="JPG, PNG or WebP, up to 5 MB." wide>
    <div className="cms-image-pick">
      {c.block.image_url
        // eslint-disable-next-line @next/next/no-img-element -- storage URL from the API
        ? <img src={c.block.image_url} alt="Selected" className="cms-thumb" />
        : <div className="cms-thumb empty" aria-hidden="true">No image</div>}
      <div>
        <input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={c.disabled || busy} onChange={ev => { void pick(ev.target.files?.[0]); ev.target.value = ''; }} />
        {busy && <small role="status"> Uploading…</small>}
        {c.block.image && !required && !c.disabled && <button type="button" className="button-secondary" style={{ marginTop: 8 }} onClick={() => c.onChange({ image: undefined, image_url: undefined })}>Remove image</button>}
      </div>
    </div>
  </Field>;
}

function CtaFields({ c }: { c: Common }) {
  return <>
    <Text c={c} field="cta_label" label="Button text (optional)" max={40} />
    <Text c={c} field="cta_url" label="Button link (optional)" max={2048} hint={URL_HINT} placeholder="/products" />
  </>;
}

export function BlockForm(c: Common) {
  const { block } = c;
  return <div className="form-grid cms-block-form">
    {block.type === 'hero' && <>
      <Text c={c} field="heading" label="Headline" max={120} wide />
      <Text c={c} field="subheading" label="Subheading (optional)" max={300} wide />
      <ImagePicker c={c} required={false} />
      <Select c={c} field="align" label="Text alignment" options={[['left', 'Left'], ['center', 'Centered']]} />
      <CtaFields c={c} />
    </>}
    {block.type === 'heading_text' && <>
      <Text c={c} field="heading" label="Heading (optional)" max={160} wide />
      <Select c={c} field="level" label="Heading size" options={[['2', 'Large'], ['3', 'Medium']]} />
      <Rich c={c} field="body" label="Text" max={10000} />
    </>}
    {block.type === 'image' && <>
      <ImagePicker c={c} required />
      <Text c={c} field="alt" label="Image description (for screen readers)" max={200} wide />
      <Text c={c} field="caption" label="Caption (optional)" max={200} wide />
    </>}
    {block.type === 'image_text' && <>
      <ImagePicker c={c} required />
      <Text c={c} field="alt" label="Image description (for screen readers)" max={200} wide />
      <Select c={c} field="image_position" label="Image position" options={[['left', 'Image on the left'], ['right', 'Image on the right']]} />
      <Text c={c} field="heading" label="Heading (optional)" max={160} wide />
      <Rich c={c} field="body" label="Text" max={5000} />
      <CtaFields c={c} />
    </>}
    {block.type === 'features' && <FeatureItems c={c} />}
    {block.type === 'cta' && <>
      <Text c={c} field="heading" label="Heading" max={160} wide />
      <Text c={c} field="text" label="Supporting text (optional)" max={300} wide />
      <Text c={c} field="button_label" label="Button text" max={40} />
      <Text c={c} field="button_url" label="Button link" max={2048} hint={URL_HINT} placeholder="/contact" />
      <Select c={c} field="style" label="Button style" options={[['primary', 'Solid'], ['secondary', 'Outline']]} />
    </>}
    {block.type === 'contact' && <>
      <Text c={c} field="heading" label="Heading (optional)" max={160} wide />
      <Text c={c} field="email" label="Email" max={190} />
      <Text c={c} field="phone" label="Phone" max={32} />
      <Text c={c} field="address" label="Address" max={300} wide />
      <Text c={c} field="hours" label="Opening hours" max={200} wide placeholder="Mon–Fri 9am–5pm" />
    </>}
  </div>;
}

function FeatureItems({ c }: { c: Common }) {
  const items = c.block.items ?? []; const base = idFor(c);
  const set = (i: number, patch: Partial<NonNullable<Block['items']>[number]>) => c.onChange({ items: items.map((item, n) => n === i ? { ...item, ...patch } : item) });
  return <>
    <Text c={c} field="heading" label="Section heading (optional)" max={160} wide />
    <div className="form-wide">
      {err(c, 'items') && <div className="cms-error" role="alert">{err(c, 'items')}</div>}
      {items.map((item, i) => {
        const tid = base(`items-${i}-title`), did = base(`items-${i}-description`), iid = base(`items-${i}-icon`);
        return <fieldset className="cms-item" key={i} disabled={c.disabled}>
          <legend>Item {i + 1}</legend>
          <Field id={tid} label="Title" error={err(c, `items.${i}.title`)}><input id={tid} value={item.title} maxLength={80} aria-invalid={!!err(c, `items.${i}.title`)} onChange={ev => set(i, { title: ev.target.value })} /></Field>
          <Field id={did} label="Description (optional)" error={err(c, `items.${i}.description`)}><input id={did} value={item.description ?? ''} maxLength={300} onChange={ev => set(i, { description: ev.target.value })} /></Field>
          <Field id={iid} label="Icon (optional)"><select id={iid} value={item.icon ?? ''} onChange={ev => set(i, { icon: ev.target.value || undefined })}><option value="">None</option>{ICONS.map(icon => <option key={icon} value={icon}>{icon[0].toUpperCase() + icon.slice(1)}</option>)}</select></Field>
          <button type="button" className="button-secondary" onClick={() => c.onChange({ items: items.filter((_, n) => n !== i) })} disabled={items.length <= 1} aria-label={`Remove item ${i + 1}`}><Trash2 size={14} /> Remove item</button>
        </fieldset>;
      })}
      <button type="button" className="button-secondary" disabled={c.disabled || items.length >= 8} onClick={() => c.onChange({ items: [...items, { title: '' }] })}><Plus size={14} /> Add item{items.length >= 8 ? ' (maximum 8)' : ''}</button>
    </div>
  </>;
}
