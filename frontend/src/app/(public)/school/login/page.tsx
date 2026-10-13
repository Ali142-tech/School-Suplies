'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch, saveAccessToken, type ApiData } from '@/lib/api';

export default function SchoolLoginPage() {
  const router = useRouter(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget);
    try { const response = await apiFetch<ApiData<unknown> & { token: string }>('/v1/school/login', { method: 'POST', body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) }); saveAccessToken(response.token); router.replace('/school/dashboard'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign in.'); } finally { setBusy(false); }
  }
  return <div className="auth-wrap"><form className="auth-card" onSubmit={submit}><span className="eyebrow">School account</span><h1>Sign in to your school</h1><p>Use the school account registered for this store.</p><div className="form-field"><label>Email</label><input name="email" type="email" required autoComplete="email"/></div><div className="form-field"><label>Password</label><input name="password" type="password" required autoComplete="current-password"/></div>{error&&<p role="alert" className="notice">{error}</p>}<button className="button-primary" disabled={busy}>{busy?'Signing in…':'Sign in'}</button><div className="auth-switch">New school? <Link href="/school/register">Create an account</Link></div></form></div>;
}
