'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, saveAccessToken } from '@/lib/api';
import { Field, FormAlert, SubmitButton, useFormRequest } from './form-ui';
import { useToast } from './toast';

type SessionUser = { role: string; owned_vendors?: { slug: string; status: string }[]; vendor_memberships?: { vendor: { slug: string; status: string } }[] };
type AuthResponse = { data: SessionUser; token: string; message?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 10;

/** Client-side checks that give the same wording the server would, before a request is made. */
function checkPasswords(password: string, confirmation: string, out: Record<string, string>) {
  if (password.length < MIN_PASSWORD) out.password = `Use at least ${MIN_PASSWORD} characters.`;
  if (confirmation !== password) out.password_confirmation = 'The two passwords don’t match.';
}

export function LoginForm({ audience = 'customer' }: { audience?: 'customer' | 'vendor' | 'admin' }) {
  const router = useRouter();
  const toast = useToast();
  const { busy, error, fields, formRef, bannerRef, run, fail, clearField } = useFormRequest();
  const label = audience === 'admin' ? 'Super Admin' : audience === 'vendor' ? 'Vendor' : 'Customer';

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

    const response = await run(() => apiFetch<AuthResponse>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }), { fallback: 'We couldn’t sign you in. Please try again.', credentials: 'Incorrect email or password. Check them and try again.' });
    if (!response) return;
    const user = response.data;
    const vendor = user.vendor_memberships?.[0]?.vendor;
    if (audience === 'admin' && user.role !== 'platform_admin') return fail('This account does not have platform administrator access.');
    if (audience === 'vendor' && !vendor) return fail('This account isn’t linked to a vendor store. Use the customer sign-in instead, or apply to sell.');
    if (audience === 'customer' && (user.role === 'platform_admin' || vendor)) return fail('This looks like a vendor or admin account. Please use the sign-in page for that account type.');
    saveAccessToken(response.token);
    toast.success('Welcome back! You’re signed in.');
    router.push(audience === 'admin' ? '/admin/dashboard' : audience === 'vendor' ? '/vendor/dashboard' : '/');
  }

  return <div className="auth-wrap"><form ref={formRef} className="auth-card" onSubmit={submit} noValidate>
    <span className="eyebrow">Papertrail {label} account</span><h1>Welcome back</h1><p>Sign in to continue to your {label.toLowerCase()} workspace.</p>
    <FormAlert message={error} bannerRef={bannerRef} />
    <Field label="Email address" name="email" type="email" autoComplete="email" error={fields.email} onInput={() => clearField('email')} />
    <Field label="Password" name="password" type="password" autoComplete="current-password" error={fields.password} onInput={() => clearField('password')} />
    <SubmitButton busy={busy} busyText="Signing in…">Sign in</SubmitButton>
    <div className="auth-switch"><Link href="/forgot-password">Forgot password?</Link></div>
    {audience === 'vendor' && <div className="auth-switch">New store? <Link href="/vendor/register">Apply to sell</Link></div>}
    {audience === 'customer' && <div className="auth-switch">New to Papertrail? <Link href="/register">Create an account</Link></div>}
  </form></div>;
}

export function CustomerRegistrationForm() {
  const router = useRouter();
  const toast = useToast();
  const { busy, error, fields, formRef, bannerRef, run, fail, clearField } = useFormRequest();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const confirmation = String(form.get('password_confirmation') ?? '');
    const problems: Record<string, string> = {};
    if (!name) problems.name = 'Enter your full name.';
    if (!email) problems.email = 'Enter your email address.';
    else if (!EMAIL.test(email)) problems.email = 'Enter a valid email address, like name@example.com.';
    checkPasswords(password, confirmation, problems);
    if (Object.keys(problems).length) return fail('Please fix the highlighted fields.', problems);

    const response = await run(() => apiFetch<AuthResponse>('/v1/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, password_confirmation: confirmation }) }), { fallback: 'We couldn’t create your account. Please try again.' });
    if (!response) return;
    saveAccessToken(response.token);
    toast.success('Account created. Welcome to Papertrail!');
    router.push('/');
  }

  return <div className="auth-wrap"><form ref={formRef} className="auth-card" onSubmit={submit} noValidate>
    <span className="eyebrow">Join Papertrail</span><h1>Create your account</h1><p>Shop thoughtful finds and keep track of your orders.</p>
    <FormAlert message={error} bannerRef={bannerRef} />
    <Field label="Full name" name="name" autoComplete="name" error={fields.name} onInput={() => clearField('name')} />
    <Field label="Email address" name="email" type="email" autoComplete="email" error={fields.email} onInput={() => clearField('email')} />
    <Field label="Password" name="password" type="password" autoComplete="new-password" hint={`At least ${MIN_PASSWORD} characters.`} error={fields.password} onInput={() => clearField('password')} />
    <Field label="Confirm password" name="password_confirmation" type="password" autoComplete="new-password" error={fields.password_confirmation} onInput={() => clearField('password_confirmation')} />
    <SubmitButton busy={busy} busyText="Creating account…">Create account</SubmitButton>
    <div className="auth-switch">Already registered? <Link href="/login">Sign in</Link></div>
  </form></div>;
}
