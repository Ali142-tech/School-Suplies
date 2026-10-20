'use client';

import Link from '@/components/store-link';
import { useStoreRouter as useRouter } from '@/components/store-link';
import { ClipboardList, Printer, Receipt, ShieldCheck } from 'lucide-react';
import { apiFetch, saveAccessToken, type ApiData } from '@/lib/api';
import { Field, FormAlert, useFormRequest } from '@/components/form-ui';
import { useToast } from '@/components/toast';
import { AuthFrame } from '@/components/portal/auth-frame';
import { Submit } from '@/components/portal/ui';
import { clearStoredSchoolCart } from './cart';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const features = [
  { icon: ClipboardList, title: 'Order supplies in bulk', text: 'Build one basket from your store’s whole catalog.' },
  { icon: Printer, title: 'Printing services', text: 'Order printed materials alongside your supplies.' },
  { icon: Receipt, title: 'Track every order', text: 'See delivery progress from placed to delivered.' },
  { icon: ShieldCheck, title: 'Private to your school', text: 'You only ever see your own orders and details.' },
];

export function SchoolUnavailable() {
  return <AuthFrame portalLabel="SCHOOL" title="Ordering for schools." text="School accounts belong to a specific vendor’s store." features={features}>
    <h1>Open your store’s address</h1>
    <p className="sub">School sign-in and registration work on your vendor’s own website address, because each school account is tied to that store. Open the link your vendor shared with you, then choose “School login”.</p>
    <p className="vp-auth-alt"><Link href="/stores">Browse stores</Link> · <Link href="/">Back to the marketplace</Link></p>
  </AuthFrame>;
}

export function SchoolLogin({ storeName }: { storeName: string }) {
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
    else if (!EMAIL.test(email)) problems.email = 'Enter a valid email address, like name@example.com.';
    if (!password) problems.password = 'Enter your password.';
    if (Object.keys(problems).length) return fail('Please fix the highlighted fields.', problems);
    const response = await run(() => apiFetch<ApiData<unknown> & { token: string }>('/v1/school/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
      { fallback: 'We couldn’t sign you in. Please try again.', credentials: 'Incorrect email or password for this school. Check them and try again.' });
    if (!response) return;
    clearStoredSchoolCart();
    saveAccessToken(response.token);
    toast.success('Welcome back!');
    router.replace('/school/dashboard');
  }

  return <AuthFrame portalLabel="SCHOOL" brandName={storeName} title={`Order from ${storeName}, the easy way.`} text="Sign in to browse the catalog, place orders and follow deliveries." features={features}>
    <form ref={formRef} method="post" onSubmit={submit} noValidate>
      <h1>School sign in</h1>
      <p className="sub">Use the school account registered with {storeName}.</p>
      <FormAlert message={error} bannerRef={bannerRef} />
      <div className="stack">
        <Field label="Email address" name="email" type="email" autoComplete="email" error={fields.email} onInput={() => clearField('email')} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" error={fields.password} onInput={() => clearField('password')} />
        <Submit busy={busy} busyText="Signing in…">Sign in</Submit>
      </div>
      <p className="vp-auth-alt"><Link href="/forgot-password">Forgot your password?</Link></p>
      <p className="vp-auth-alt" style={{ marginTop: 8 }}>New school? <Link href="/school/register">Create a school account</Link></p>
    </form>
  </AuthFrame>;
}

export function SchoolRegister({ storeName }: { storeName: string }) {
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
    if (!text('school_name')) problems.school_name = 'Enter your school’s name.';
    if (!text('contact_name')) problems.name = 'Enter the contact person’s name.';
    if (!text('email')) problems.email = 'Enter an email address.';
    else if (!EMAIL.test(text('email'))) problems.email = 'Enter a valid email address, like name@example.com.';
    if (password.length < 10) problems.password = 'Use at least 10 characters.';
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) problems.password = 'Include at least one letter and one number.';
    if (confirmation !== password) problems.password_confirmation = 'The two passwords don’t match.';
    if (Object.keys(problems).length) return fail('Please fix the highlighted fields.', problems);

    const response = await run(() => apiFetch<ApiData<unknown> & { token: string }>('/v1/school/register', {
      method: 'POST',
      body: JSON.stringify({ name: text('contact_name'), email: text('email'), phone: text('phone'), school_name: text('school_name'), school_phone: text('school_phone'), address: text('address'), password, password_confirmation: confirmation }),
    }), { fallback: 'We couldn’t create the school account. Please try again.' });
    if (!response) return;
    clearStoredSchoolCart();
    saveAccessToken(response.token);
    toast.success('School account created. Welcome!');
    router.replace('/school/dashboard');
  }

  return <AuthFrame portalLabel="SCHOOL" brandName={storeName} title="Set your school up in a minute." text={`Your account will be connected to ${storeName}.`} features={features}>
    <form ref={formRef} method="post" onSubmit={submit} noValidate>
      <h1>Register your school</h1>
      <p className="sub">Create the account your school will use to order from {storeName}.</p>
      <FormAlert message={error} bannerRef={bannerRef} />
      <div className="stack">
        <Field label="School name" name="school_name" maxLength={180} error={fields.school_name} onInput={() => clearField('school_name')} />
        <Field label="Contact name" name="contact_name" autoComplete="name" error={fields.name} onInput={() => clearField('name')} />
        <Field label="Email address" name="email" type="email" autoComplete="email" error={fields.email} onInput={() => clearField('email')} />
        <div className="form-grid"><Field label="Contact phone" name="phone" type="tel" autoComplete="tel" error={fields.phone} onInput={() => clearField('phone')} /><Field label="School phone" name="school_phone" type="tel" error={fields.school_phone} onInput={() => clearField('school_phone')} /></div>
        <Field as="textarea" label="School address" name="address" hint="Used as your default delivery address." error={fields.address} onInput={() => clearField('address')} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" hint="At least 10 characters, with a letter and a number." error={fields.password} onInput={() => clearField('password')} />
        <Field label="Confirm password" name="password_confirmation" type="password" autoComplete="new-password" error={fields.password_confirmation} onInput={() => clearField('password_confirmation')} />
        <Submit busy={busy} busyText="Creating account…">Create school account</Submit>
      </div>
      <p className="vp-auth-alt">Already registered? <Link href="/school/login">Sign in</Link></p>
    </form>
  </AuthFrame>;
}
