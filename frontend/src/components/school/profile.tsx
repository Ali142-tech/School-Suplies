'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { fieldErrors, friendlyMessage } from '@/lib/errors';
import { Field } from '@/components/form-ui';
import { useToast } from '@/components/toast';
import { PasswordCard } from '@/components/portal/account';
import { Badge, Card, PageHeader, Spinner, clearErrorOnInput } from '@/components/portal/ui';
import { useSchoolSession } from './shell';

export function SchoolProfilePage() {
  const toast = useToast();
  const session = useSchoolSession();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!session) return null;
  const { school, store } = session;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const text = (k: string) => String(f.get(k) ?? '').trim();
    const problems: Record<string, string> = {};
    if (!text('name')) problems.name = 'Enter the school name.';
    if (!text('contact_name')) problems.contact_name = 'Enter the contact person’s name.';
    if (Object.keys(problems).length) return setErrors(problems);
    setBusy(true); setErrors({});
    try {
      await apiFetch('/v1/school/profile', { method: 'PUT', body: JSON.stringify({ name: text('name'), phone: text('phone') || null, address: text('address') || null, contact_name: text('contact_name'), contact_phone: text('contact_phone') || null }) });
      toast.success('School profile saved.'); await session?.reload();
    } catch (cause) { setErrors(cause instanceof ApiError ? fieldErrors(cause) : {}); toast.error(friendlyMessage(cause, 'Could not save your profile.')); } finally { setBusy(false); }
  }

  return <>
    <PageHeader title="School profile" description="Your school’s details and the contact person for orders." />
    <div className="vp-cols">
      <Card title="School details" description="The delivery address is pre-filled at checkout.">
        <form className="form-grid" onSubmit={save} onInput={clearErrorOnInput(setErrors)} noValidate>
          <Field label="School name" name="name" defaultValue={school.name} maxLength={180} error={errors.name} />
          <Field label="School phone" name="phone" type="tel" defaultValue={school.phone ?? ''} error={errors.phone} />
          <Field as="textarea" wide label="Delivery address" name="address" defaultValue={school.address ?? ''} maxLength={2000} error={errors.address} />
          <Field label="Contact name" name="contact_name" defaultValue={school.user.name} autoComplete="name" error={errors.contact_name} />
          <Field label="Contact phone" name="contact_phone" type="tel" defaultValue={school.user.phone ?? ''} autoComplete="tel" error={errors.contact_phone} />
          <div className="form-field form-wide"><label htmlFor="school-email">Sign-in email</label><input id="school-email" value={school.user.email} readOnly /><small>Contact your store if you need to change it.</small></div>
          <div className="form-wide"><button className="btn primary" disabled={busy}>{busy ? <><Spinner />Saving…</> : 'Save profile'}</button></div>
        </form>
      </Card>
      <Card title="Your store"><div className="vp-item"><span className="muted">Vendor</span><b>{store?.name ?? '—'}</b></div><div className="vp-item"><span className="muted">Account type</span><Badge tone="info">School</Badge></div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>Each school account belongs to one store and sees only that store’s products and your own orders.</p></Card>
    </div>
    <PasswordCard />
  </>;
}
