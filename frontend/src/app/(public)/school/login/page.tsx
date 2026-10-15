'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, saveAccessToken, type ApiData } from '@/lib/api';
import { Field, FormAlert, SubmitButton, useFormRequest } from '@/components/form-ui';
import { useToast } from '@/components/toast';

export default function SchoolLoginPage() {
  const router = useRouter();
  const toast = useToast();
  const { busy, error, fields, formRef, bannerRef, run, fail, clearField } = useFormRequest();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const problems: Record<string, string> = {};
    if (!email) problems.email = 'Enter your school account email.';
    if (!password) problems.password = 'Enter your password.';
    if (Object.keys(problems).length) return fail('Please fix the highlighted fields.', problems);
    const response = await run(() => apiFetch<ApiData<unknown> & { token: string }>('/v1/school/login', { method: 'POST', body: JSON.stringify({ email, password }) }), { fallback: 'We couldn’t sign you in. Please try again.', credentials: 'Incorrect email or password for this school. Check them and try again.' });
    if (!response) return;
    saveAccessToken(response.token);
    toast.success('Welcome back! You’re signed in.');
    router.replace('/school/dashboard');
  }

  return <div className="auth-wrap"><form ref={formRef} className="auth-card" onSubmit={submit} noValidate>
    <span className="eyebrow">School account</span><h1>Sign in to your school</h1><p>Use the school account registered for this store.</p>
    <FormAlert message={error} bannerRef={bannerRef} />
    <Field label="Email" name="email" type="email" autoComplete="email" error={fields.email} onInput={() => clearField('email')} />
    <Field label="Password" name="password" type="password" autoComplete="current-password" error={fields.password} onInput={() => clearField('password')} />
    <SubmitButton busy={busy} busyText="Signing in…">Sign in</SubmitButton>
    <div className="auth-switch">New school? <Link href="/school/register">Create an account</Link></div>
  </form></div>;
}
