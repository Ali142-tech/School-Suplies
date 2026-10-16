'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { fieldErrors, friendlyMessage } from '@/lib/errors';
import { Field } from '@/components/form-ui';
import { useToast } from '@/components/toast';
import { Card, Spinner, clearErrorOnInput } from './ui';

/** Change-password card. Works for any signed-in account (PUT /v1/auth/password); Laravel enforces the current-password check. */
export function PasswordCard() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const f = new FormData(form);
    const next = String(f.get('password') ?? '');
    const problems: Record<string, string> = {};
    if (!String(f.get('current_password') ?? '')) problems.current_password = 'Enter your current password.';
    if (next.length < 10) problems.password = 'Use at least 10 characters.';
    else if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) problems.password = 'Include at least one letter and one number.';
    if (next !== String(f.get('password_confirmation') ?? '')) problems.password_confirmation = 'The two passwords don’t match.';
    if (Object.keys(problems).length) return setErrors(problems);
    setBusy(true); setErrors({});
    try {
      await apiFetch('/v1/auth/password', { method: 'PUT', body: JSON.stringify({ current_password: f.get('current_password'), password: next, password_confirmation: f.get('password_confirmation') }) });
      toast.success('Your password has been changed.'); form.reset();
    } catch (cause) {
      const byField = cause instanceof ApiError ? fieldErrors(cause) : {};
      setErrors(Object.keys(byField).length ? byField : { current_password: friendlyMessage(cause, 'Could not change your password.') });
    } finally { setBusy(false); }
  }

  return <Card title="Change password" description="Choose a strong password you don’t use anywhere else.">
    <form className="form-grid" onSubmit={submit} onInput={clearErrorOnInput(setErrors)} style={{ maxWidth: 720 }} noValidate>
      <div className="form-wide"><Field label="Current password" name="current_password" type="password" autoComplete="current-password" error={errors.current_password} /></div>
      <Field label="New password" name="password" type="password" autoComplete="new-password" hint="At least 10 characters, with a letter and a number." error={errors.password} />
      <Field label="Confirm new password" name="password_confirmation" type="password" autoComplete="new-password" error={errors.password_confirmation} />
      <div className="form-wide"><button className="btn primary" disabled={busy}>{busy ? <><Spinner />Updating…</> : 'Update password'}</button></div>
    </form>
  </Card>;
}

/** Name / phone card for accounts that use the generic profile endpoint (PUT /v1/auth/profile). */
export function PersonalDetailsCard({ name, email, phone, onSaved }: { name: string; email: string; phone?: string | null; onSaved: () => Promise<void> | void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setBusy(true); setErrors({});
    try {
      await apiFetch('/v1/auth/profile', { method: 'PUT', body: JSON.stringify({ name: String(f.get('name') ?? '').trim(), phone: String(f.get('phone') ?? '').trim() || null }) });
      toast.success('Profile saved.'); await onSaved();
    } catch (cause) { setErrors(fieldErrors(cause)); toast.error(friendlyMessage(cause, 'Could not save your profile.')); } finally { setBusy(false); }
  }

  return <Card title="Personal details" description="Used for sign-in and notifications.">
    <form className="form-grid" onSubmit={save}>
      <Field label="Full name" name="name" defaultValue={name} required error={errors.name} />
      <Field label="Phone" name="phone" type="tel" defaultValue={phone ?? ''} error={errors.phone} />
      <div className="form-field form-wide"><label htmlFor="acct-email">Email address</label><input id="acct-email" value={email} readOnly /><small>Contact support if you need to change your sign-in email.</small></div>
      <div className="form-wide"><button className="btn primary" disabled={busy}>{busy ? <><Spinner />Saving…</> : 'Save profile'}</button></div>
    </form>
  </Card>;
}
