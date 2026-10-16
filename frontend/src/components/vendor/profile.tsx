'use client';

import { useState } from 'react';
import { ApiError, apiFetch, type ApiData } from '@/lib/api';
import { fieldErrors, friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/toast';
import { Field } from '@/components/form-ui';
import { useVendorSession } from '@/components/vendor-shell';
import { Badge, Card, PageHeader, Spinner, titleCase } from './ui';

export function VendorProfile() {
  const session = useVendorSession();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  if (!session) return null;
  const { user, role } = session;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setBusy(true); setErrors({});
    try {
      await apiFetch<ApiData<unknown>>('/v1/auth/profile', { method: 'PUT', body: JSON.stringify({ name: String(f.get('name')).trim(), phone: String(f.get('phone') ?? '').trim() || null }) });
      toast.success('Profile saved.'); await session?.reload();
    } catch (cause) { setErrors(cause instanceof ApiError ? fieldErrors(cause) : {}); toast.error(friendlyMessage(cause, 'Could not save your profile.')); } finally { setBusy(false); }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const f = new FormData(form);
    const next = String(f.get('password'));
    const problems: Record<string, string> = {};
    if (next.length < 10) problems.password = 'Use at least 10 characters.';
    if (next !== String(f.get('password_confirmation'))) problems.password_confirmation = 'The two passwords don’t match.';
    if (Object.keys(problems).length) return setPwErrors(problems);
    setPwBusy(true); setPwErrors({});
    try {
      await apiFetch('/v1/auth/password', { method: 'PUT', body: JSON.stringify({ current_password: f.get('current_password'), password: next, password_confirmation: f.get('password_confirmation') }) });
      toast.success('Your password has been changed.'); form.reset();
    } catch (cause) {
      const byField = cause instanceof ApiError ? fieldErrors(cause) : {};
      setPwErrors(Object.keys(byField).length ? byField : { current_password: friendlyMessage(cause, 'Could not change your password.') });
    } finally { setPwBusy(false); }
  }

  return <>
    <PageHeader title="My profile" description="Your personal account details and security." />
    <div className="vp-cols">
      <Card title="Personal details" description="Used for sign-in and notifications.">
        <form className="form-grid" onSubmit={save}>
          <div className={`form-field${errors.name ? ' has-error' : ''}`}><label htmlFor="u-name">Full name</label><input id="u-name" name="name" defaultValue={user.name} required />{errors.name && <small className="field-error">{errors.name}</small>}</div>
          <div className="form-field"><label htmlFor="u-phone">Phone</label><input id="u-phone" name="phone" type="tel" defaultValue={user.phone ?? ''} /></div>
          <div className="form-field form-wide"><label htmlFor="u-email">Email address</label><input id="u-email" value={user.email} readOnly /><small>Contact support if you need to change your sign-in email.</small></div>
          <div className="form-wide"><button className="btn primary" disabled={busy}>{busy ? <><Spinner />Saving…</> : 'Save profile'}</button></div>
        </form>
      </Card>
      <Card title="Access">
        <div className="vp-item"><span className="muted">Store</span><b>{session.vendor.name}</b></div>
        <div className="vp-item"><span className="muted">Your role</span><Badge tone="info">{titleCase(role)}</Badge></div>
        <div className="vp-item"><span className="muted">Store status</span><Badge tone={session.vendor.status === 'active' ? 'ok' : 'warn'}>{titleCase(session.vendor.status)}</Badge></div>
      </Card>
    </div>
    <Card title="Change password" description="Choose a strong password you don’t use elsewhere.">
      <form className="form-grid" onSubmit={changePassword} style={{ maxWidth: 720 }}>
        <div className="form-wide"><Field label="Current password" name="current_password" type="password" autoComplete="current-password" error={pwErrors.current_password} /></div>
        <Field label="New password" name="password" type="password" autoComplete="new-password" hint="At least 10 characters, with a letter and a number." error={pwErrors.password} />
        <Field label="Confirm new password" name="password_confirmation" type="password" autoComplete="new-password" error={pwErrors.password_confirmation} />
        <div className="form-wide"><button className="btn primary" disabled={pwBusy}>{pwBusy ? <><Spinner />Updating…</> : 'Update password'}</button></div>
      </form>
    </Card>
  </>;
}
