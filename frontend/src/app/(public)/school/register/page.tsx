'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch, saveAccessToken, type ApiData } from '@/lib/api';

export default function SchoolRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await apiFetch<ApiData<unknown> & { token: string }>('/v1/school/register', { method: 'POST', body: JSON.stringify({ name: form.get('contact_name'), email: form.get('email'), phone: form.get('phone'), school_name: form.get('school_name'), school_phone: form.get('school_phone'), address: form.get('address'), password: form.get('password'), password_confirmation: form.get('password_confirmation') }) });
      saveAccessToken(response.token); router.replace('/school/dashboard');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create school account.'); }
    finally { setBusy(false); }
  }

  return <div className="auth-wrap"><form className="auth-card" onSubmit={submit}><span className="eyebrow">School account</span><h1>Register your school</h1><p>Your account will be connected to this vendor’s store.</p>
    <div className="form-field"><label>School name</label><input name="school_name" required maxLength={180}/></div>
    <div className="form-field"><label>Contact name</label><input name="contact_name" required autoComplete="name"/></div>
    <div className="form-field"><label>Email</label><input name="email" type="email" required autoComplete="email"/></div>
    <div className="form-field"><label>Contact phone</label><input name="phone" autoComplete="tel"/></div>
    <div className="form-field"><label>School phone</label><input name="school_phone"/></div>
    <div className="form-field"><label>School address</label><textarea name="address"/></div>
    <div className="form-field"><label>Password</label><input name="password" type="password" minLength={10} required autoComplete="new-password"/></div>
    <div className="form-field"><label>Confirm password</label><input name="password_confirmation" type="password" minLength={10} required autoComplete="new-password"/></div>
    {error&&<p role="alert" className="notice">{error}</p>}<button className="button-primary" disabled={busy}>{busy?'Creating account…':'Create school account'}</button><div className="auth-switch">Already registered? <Link href="/school/login">Sign in</Link></div>
  </form></div>;
}
