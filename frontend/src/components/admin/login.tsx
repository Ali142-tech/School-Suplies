'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, ClipboardCheck, ShieldCheck, Users } from 'lucide-react';
import { apiFetch, saveAccessToken } from '@/lib/api';
import { Field, FormAlert, useFormRequest } from '@/components/form-ui';
import { useToast } from '@/components/toast';
import { AuthFrame } from '@/components/portal/auth-frame';
import { Submit } from '@/components/portal/ui';
import type { SessionUser } from '@/lib/session';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminLogin() {
  const router = useRouter();
  const toast = useToast();
  const { busy, error, fields, formRef, bannerRef, run, fail, clearField } = useFormRequest();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const problems: Record<string, string> = {};
    if (!email) problems.email = 'Enter your email address.';
    else if (!EMAIL.test(email)) problems.email = 'Enter a valid email address, like name@example.com.';
    if (!password) problems.password = 'Enter your password.';
    if (Object.keys(problems).length) return fail('Please fix the highlighted fields.', problems);

    const response = await run(() => apiFetch<{ data: SessionUser; token: string }>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
      { fallback: 'We couldn’t sign you in. Please try again.', credentials: 'Incorrect email or password. Check them and try again.' });
    if (!response) return;
    if (response.data.role !== 'platform_admin') {
      // The token was issued but is never stored, so the account gets no access through this portal.
      return fail('This account does not have platform administrator access.');
    }
    saveAccessToken(response.token);
    toast.success('Welcome back!');
    router.push('/admin/dashboard');
  }

  return <AuthFrame portalLabel="ADMIN" title="Run the whole marketplace from one place." text="Review vendors, moderate the catalog and keep the platform healthy."
    features={[
      { icon: ClipboardCheck, title: 'Vendor reviews', text: 'Approve, reject, suspend and reactivate stores.' },
      { icon: Building2, title: 'Domains & plans', text: 'Activate storefront domains and track subscriptions.' },
      { icon: Users, title: 'Accounts & schools', text: 'Control who can sign in across every portal.' },
      { icon: ShieldCheck, title: 'Server-enforced access', text: 'Every action is authorised by the API, not the browser.' },
    ]}>
    <form ref={formRef} method="post" onSubmit={submit} noValidate>
      <h1>Administrator sign in</h1>
      <p className="sub">Sign in with your platform administrator account.</p>
      <FormAlert message={error} bannerRef={bannerRef} />
      <div className="stack">
        <Field label="Email address" name="email" type="email" autoComplete="email" error={fields.email} onInput={() => clearField('email')} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" error={fields.password} onInput={() => clearField('password')} />
        <Submit busy={busy} busyText="Signing in…">Sign in</Submit>
      </div>
      <p className="vp-auth-alt"><Link href="/forgot-password">Forgot your password?</Link></p>
      <p className="vp-auth-alt" style={{ marginTop: 8 }}><Link href="/">← Back to the marketplace</Link></p>
    </form>
  </AuthFrame>;
}
