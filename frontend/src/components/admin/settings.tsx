'use client';

import { useEffect, useState } from 'react';
import { ApiError, apiFetch, type ApiData } from '@/lib/api';
import { fieldErrors, friendlyMessage } from '@/lib/errors';
import { Field } from '@/components/form-ui';
import { useToast } from '@/components/toast';
import { PasswordCard, PersonalDetailsCard } from '@/components/portal/account';
import { Badge, Banner, Card, PageHeader, Skeleton, Spinner, clearErrorOnInput } from '@/components/portal/ui';
import { useAdminSession } from './shell';

type Settings = { marketplace_name?: string | null; support_email?: string | null; currency?: string | null };

export function AdminSettings() {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { apiFetch<ApiData<Settings>>('/v1/admin/settings').then(r => setSettings(r.data)).catch(c => { setError(friendlyMessage(c, 'Could not load settings.')); setSettings({}); }); }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const body: Settings = { marketplace_name: String(f.get('marketplace_name') ?? '').trim(), support_email: String(f.get('support_email') ?? '').trim() || null, currency: 'PKR' };
    if (!body.marketplace_name) return setErrors({ marketplace_name: 'Enter the marketplace name.' });
    setBusy(true); setErrors({});
    try { const r = await apiFetch<ApiData<Settings>>('/v1/admin/settings', { method: 'PUT', body: JSON.stringify(body) }); setSettings(r.data); toast.success('Settings saved.'); }
    catch (cause) { setErrors(cause instanceof ApiError ? fieldErrors(cause) : {}); toast.error(friendlyMessage(cause, 'Could not save settings.')); } finally { setBusy(false); }
  }

  return <>
    <PageHeader title="Platform settings" description="Marketplace-wide details used across the platform." />
    {error && <Banner tone="bad">{error}</Banner>}
    <Card title="Marketplace" description="Shown to customers and used for support contact.">
      {!settings ? <Skeleton h={42} /> : <form className="form-grid" onSubmit={save} onInput={clearErrorOnInput(setErrors)} style={{ maxWidth: 720 }} noValidate>
        <Field label="Marketplace name" name="marketplace_name" defaultValue={settings.marketplace_name ?? ''} maxLength={160} error={errors.marketplace_name} />
        <Field label="Support email" name="support_email" type="email" defaultValue={settings.support_email ?? ''} error={errors.support_email} />
        <div className="form-field"><label>Currency</label><div><Badge tone="info">PKR</Badge></div><small>The platform currently operates in Pakistani rupees only.</small></div>
        <div className="form-wide"><button className="btn primary" disabled={busy}>{busy ? <><Spinner />Saving…</> : 'Save settings'}</button></div>
      </form>}
    </Card>
  </>;
}

export function AdminAccount() {
  const session = useAdminSession();
  if (!session) return null;
  const { user } = session;
  return <>
    <PageHeader title="My account" description="Your administrator profile and security." />
    <PersonalDetailsCard name={user.name} email={user.email} phone={user.phone} onSaved={session.reload} />
    <PasswordCard />
  </>;
}
