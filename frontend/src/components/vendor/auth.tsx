'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { BarChart3, FileText, Globe, Package, PackageCheck, ShieldCheck } from 'lucide-react';
import { apiFetch, saveAccessToken } from '@/lib/api';
import { Field, FormAlert, useFormRequest } from '@/components/form-ui';
import { useToast } from '@/components/toast';
import { Spinner } from './ui';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MIN_PASSWORD = 10;
const PLATFORM = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'papertrail.store').replace(/^\.+/, '');

type SessionUser = { role: string; vendor_memberships?: { vendor: { slug: string; status: string } }[] };

export function slugFrom(text: string) {
  return text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
}

/** 0–4 score so people can see how strong their password is before the server's own rules run. */
function strength(pw: string) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= MIN_PASSWORD) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) score++;
  return Math.max(1, score);
}

function AuthFrame({ children, title, text }: { children: React.ReactNode; title: string; text: string }) {
  return <div className="vp-auth">
    <aside className="vp-auth-aside">
      <Link href="/" className="vp-logo"><i><PackageCheck size={19} /></i><span>papertrail <small>VENDOR</small></span></Link>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
        <ul className="vp-feats">
          <li><Package size={16} /><span><b>Products &amp; inventory</b>List items, track stock and manage categories.</span></li>
          <li><FileText size={16} /><span><b>Your own website</b>Build pages, set your brand, and publish when ready.</span></li>
          <li><BarChart3 size={16} /><span><b>Orders &amp; quotes</b>Fulfil orders and answer printing requests in one place.</span></li>
          <li><Globe size={16} /><span><b>A storefront address</b>Your store lives at its own link on the platform.</span></li>
        </ul>
      </div>
      <div className="vp-auth-foot"><ShieldCheck size={14} style={{ verticalAlign: '-2px' }} /> Secure sign-in · Your data stays yours</div>
    </aside>
    <main className="vp-auth-main">
      <div className="vp-auth-card">
        <Link href="/" className="vp-logo vp-auth-top"><i><PackageCheck size={19} /></i><span>papertrail <small>VENDOR</small></span></Link>
        {children}
      </div>
    </main>
  </div>;
}

function Submit({ busy, busyText, children }: { busy: boolean; busyText: string; children: React.ReactNode }) {
  return <button className="btn primary" disabled={busy} aria-busy={busy}>{busy ? <><Spinner />{busyText}</> : children}</button>;
}

export function VendorLogin() {
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

    const response = await run(() => apiFetch<{ data: SessionUser; token: string }>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }), { fallback: 'We couldn’t sign you in. Please try again.', credentials: 'Incorrect email or password. Check them and try again.' });
    if (!response) return;
    if (!response.data.vendor_memberships?.[0]?.vendor) return fail('This account isn’t linked to a vendor store. Create a vendor account below, or use the customer sign-in.');
    saveAccessToken(response.token);
    toast.success('Welcome back!');
    router.push('/vendor/dashboard');
  }

  return <AuthFrame title="Run your store from one calm dashboard." text="Sign in to manage products, orders, printing quotes and your store website.">
    <form ref={formRef} method="post" onSubmit={submit} noValidate>
      <h1>Welcome back</h1>
      <p className="sub">Sign in to your vendor account.</p>
      <FormAlert message={error} bannerRef={bannerRef} />
      <div className="stack">
        <Field label="Email address" name="email" type="email" autoComplete="email" error={fields.email} onInput={() => clearField('email')} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" error={fields.password} onInput={() => clearField('password')} />
        <Submit busy={busy} busyText="Signing in…">Sign in</Submit>
      </div>
      <p className="vp-auth-alt"><Link href="/vendor/forgot-password">Forgot your password?</Link></p>
      <p className="vp-auth-alt" style={{ marginTop: 8 }}>New here? <Link href="/vendor/register">Create a vendor account</Link></p>
    </form>
  </AuthFrame>;
}

export function VendorSignup() {
  const router = useRouter();
  const toast = useToast();
  const slugId = useId();
  const { busy, error, fields, formRef, bannerRef, run, fail, clearField } = useFormRequest();
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [password, setPassword] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '').trim();
    const confirmation = String(form.get('password_confirmation') ?? '');
    const problems: Record<string, string> = {};
    if (!text('name')) problems.name = 'Enter your name.';
    if (!text('email')) problems.email = 'Enter your email address.';
    else if (!EMAIL.test(text('email'))) problems.email = 'Enter a valid email address, like name@example.com.';
    if (!slug) problems.store_slug = 'Choose your store address.';
    else if (!SLUG.test(slug)) problems.store_slug = 'Use lowercase letters, numbers and single hyphens only, like my-store.';
    if (password.length < MIN_PASSWORD) problems.password = `Use at least ${MIN_PASSWORD} characters.`;
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) problems.password = 'Include at least one letter and one number.';
    if (confirmation !== password) problems.password_confirmation = 'The two passwords don’t match.';
    if (Object.keys(problems).length) return fail('Please fix the highlighted fields.', problems);

    const response = await run(() => apiFetch<{ token: string }>('/v1/auth/vendor/register', {
      method: 'POST',
      body: JSON.stringify({ name: text('name'), email: text('email'), store_slug: slug, password, password_confirmation: confirmation }),
    }), { fallback: 'We couldn’t create your account. Please try again.' });
    if (!response) return;
    saveAccessToken(response.token);
    toast.success('Your vendor account is ready.');
    router.push('/vendor/dashboard?welcome=1');
  }

  const score = strength(password);
  return <AuthFrame title="Open your store in minutes." text="Create your vendor account, then build your catalog and website from your own dashboard.">
    <form ref={formRef} method="post" onSubmit={submit} noValidate>
      <h1>Create your vendor account</h1>
      <p className="sub">It takes less than a minute. No card required.</p>
      <FormAlert message={error} bannerRef={bannerRef} />
      <div className="stack">
        <Field label="Your name" name="name" autoComplete="name" error={fields.name} onInput={() => clearField('name')} onChange={e => { if (!slugTouched) setSlug(slugFrom(e.target.value)); }} />
        <Field label="Email address" name="email" type="email" autoComplete="email" error={fields.email} onInput={() => clearField('email')} />
        <div className={`form-field${fields.store_slug ? ' has-error' : ''}`}>
          <label htmlFor={slugId}>Store address (slug)</label>
          <div className="vp-slug">
            <input id={slugId} name="store_slug" value={slug} maxLength={63} autoComplete="off" spellCheck={false} placeholder="my-store" aria-invalid={fields.store_slug ? true : undefined}
              onChange={e => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); clearField('store_slug'); }} />
            <span>.{PLATFORM}</span>
          </div>
          {fields.store_slug ? <small className="field-error">{fields.store_slug}</small> : <small>This becomes your store’s web address. Lowercase letters, numbers and hyphens.</small>}
        </div>
        <div className="form-field">
          <Field label="Password" name="password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} error={fields.password} hint={`At least ${MIN_PASSWORD} characters, with a letter and a number.`} onInput={() => clearField('password')} />
          <div className="vp-pw-meter" data-s={score} aria-hidden="true"><i /><i /><i /><i /></div>
        </div>
        <Field label="Confirm password" name="password_confirmation" type="password" autoComplete="new-password" error={fields.password_confirmation} onInput={() => clearField('password_confirmation')} />
        <Submit busy={busy} busyText="Creating account…">Create vendor account</Submit>
      </div>
      <p className="vp-auth-alt">Already have an account? <Link href="/vendor/login">Sign in</Link></p>
    </form>
  </AuthFrame>;
}

export function VendorForgotPassword() {
  const { busy, error, fields, formRef, bannerRef, run, fail, clearField } = useFormRequest();
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    if (!EMAIL.test(email)) return fail('Please fix the highlighted fields.', { email: 'Enter a valid email address, like name@example.com.' });
    const ok = await run(async () => { await apiFetch('/v1/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email }) }); return true; }, { fallback: 'We couldn’t send reset instructions. Please try again.' });
    if (ok) setSent(true);
  }

  return <AuthFrame title="Locked out? It happens." text="We’ll email you a secure link to choose a new password.">
    <form ref={formRef} method="post" onSubmit={submit} noValidate>
      <h1>{sent ? 'Check your inbox' : 'Reset your password'}</h1>
      <p className="sub">{sent ? 'If an account exists for that email, reset instructions are on their way. It can take a few minutes.' : 'Enter the email you used to sign up.'}</p>
      {!sent && <>
        <FormAlert message={error} bannerRef={bannerRef} />
        <div className="stack">
          <Field label="Email address" name="email" type="email" autoComplete="email" error={fields.email} onInput={() => clearField('email')} />
          <Submit busy={busy} busyText="Sending…">Send reset link</Submit>
        </div>
      </>}
      <p className="vp-auth-alt"><Link href="/vendor/login">Back to sign in</Link></p>
    </form>
  </AuthFrame>;
}
