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

export function VendorRegistrationForm() {
  const router = useRouter();
  const toast = useToast();
  const { busy, error, fields, formRef, bannerRef, run, fail, clearField } = useFormRequest();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '').trim();
    const password = String(form.get('password') ?? '');
    const confirmation = String(form.get('password_confirmation') ?? '');
    const problems: Record<string, string> = {};
    if (!text('name')) problems.name = 'Enter your full name.';
    if (!text('business_name')) problems.business_name = 'Enter your business or store name.';
    if (!text('store_slug')) problems.store_slug = 'Choose a store address.';
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(text('store_slug'))) problems.store_slug = 'Use lowercase letters, numbers and single hyphens only, like my-store.';
    if (!text('email')) problems.email = 'Enter your email address.';
    else if (!EMAIL.test(text('email'))) problems.email = 'Enter a valid email address, like name@example.com.';
    if (!text('phone')) problems.phone = 'Enter a phone number we can reach you on.';
    if (!text('business_address')) problems.business_address = 'Enter your business address.';
    checkPasswords(password, confirmation, problems);
    if (!form.get('terms_accepted')) problems.terms_accepted = 'Please accept the vendor terms to continue.';
    if (Object.keys(problems).length) return fail('Please fix the highlighted fields.', problems);

    const response = await run(() => apiFetch<{ data: { user: SessionUser; vendor: { slug: string; status: string } }; token: string }>('/v1/auth/vendor/register', {
      method: 'POST',
      body: JSON.stringify({ name: text('name'), business_name: text('business_name'), store_slug: text('store_slug'), email: text('email'), phone: text('phone'), password, password_confirmation: confirmation, business_address: text('business_address'), terms_accepted: '1' }),
    }), { fallback: 'We couldn’t submit your application. Please try again.' });
    if (!response) return;
    saveAccessToken(response.token);
    toast.success('Application submitted. We’ll review your store shortly.');
    router.push('/vendor/dashboard?welcome=pending');
  }

  return <div className="auth-wrap"><form ref={formRef} className="auth-card" style={{ width: 'min(620px,100%)' }} onSubmit={submit} noValidate>
    <span className="eyebrow">Sell on Papertrail</span><h1>Apply for a vendor account</h1><p>Your account can sign in right away. Store selling tools unlock after platform approval.</p>
    <FormAlert message={error} bannerRef={bannerRef} />
    <div className="form-grid">
      <Field label="Full name" name="name" autoComplete="name" error={fields.name} onInput={() => clearField('name')} />
      <Field label="Business/store name" name="business_name" error={fields.business_name} onInput={() => clearField('business_name')} />
      <Field wide label="Requested store address" name="store_slug" maxLength={63} placeholder="my-store" hint="Your proposed subdomain, subject to approval and availability." error={fields.store_slug} onInput={() => clearField('store_slug')} />
      <Field label="Email address" name="email" type="email" autoComplete="email" error={fields.email} onInput={() => clearField('email')} />
      <Field label="Phone number" name="phone" type="tel" autoComplete="tel" error={fields.phone} onInput={() => clearField('phone')} />
      <Field label="Password" name="password" type="password" autoComplete="new-password" hint={`At least ${MIN_PASSWORD} characters.`} error={fields.password} onInput={() => clearField('password')} />
      <Field label="Confirm password" name="password_confirmation" type="password" autoComplete="new-password" error={fields.password_confirmation} onInput={() => clearField('password_confirmation')} />
      <Field wide as="textarea" label="Business address" name="business_address" error={fields.business_address} onInput={() => clearField('business_address')} />
      <div className="form-wide terms">
        <label><input name="terms_accepted" type="checkbox" aria-invalid={fields.terms_accepted ? true : undefined} onChange={() => clearField('terms_accepted')} /> I agree to the vendor terms and marketplace policies.</label>
        {fields.terms_accepted && <small className="field-error">{fields.terms_accepted}</small>}
      </div>
    </div>
    <SubmitButton busy={busy} busyText="Submitting…">Submit vendor application</SubmitButton>
    <div className="auth-switch">Already have a vendor account? <Link href="/vendor/login">Sign in</Link></div>
  </form></div>;
}
