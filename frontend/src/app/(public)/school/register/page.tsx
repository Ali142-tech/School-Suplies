'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, saveAccessToken, type ApiData } from '@/lib/api';
import { Field, FormAlert, SubmitButton, useFormRequest } from '@/components/form-ui';
import { useToast } from '@/components/toast';

export default function SchoolRegisterPage() {
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
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text('email'))) problems.email = 'Enter a valid email address, like name@example.com.';
    if (password.length < 10) problems.password = 'Use at least 10 characters.';
    if (confirmation !== password) problems.password_confirmation = 'The two passwords don’t match.';
    if (Object.keys(problems).length) return fail('Please fix the highlighted fields.', problems);

    const response = await run(() => apiFetch<ApiData<unknown> & { token: string }>('/v1/school/register', {
      method: 'POST',
      body: JSON.stringify({ name: text('contact_name'), email: text('email'), phone: text('phone'), school_name: text('school_name'), school_phone: text('school_phone'), address: text('address'), password, password_confirmation: confirmation }),
    }), { fallback: 'We couldn’t create the school account. Please try again.' });
    if (!response) return;
    saveAccessToken(response.token);
    toast.success('School account created. Welcome!');
    router.replace('/school/dashboard');
  }

  return <div className="auth-wrap"><form ref={formRef} className="auth-card" onSubmit={submit} noValidate>
    <span className="eyebrow">School account</span><h1>Register your school</h1><p>Your account will be connected to this vendor’s store.</p>
    <FormAlert message={error} bannerRef={bannerRef} />
    <Field label="School name" name="school_name" maxLength={180} error={fields.school_name} onInput={() => clearField('school_name')} />
    <Field label="Contact name" name="contact_name" autoComplete="name" error={fields.name} onInput={() => clearField('name')} />
    <Field label="Email" name="email" type="email" autoComplete="email" error={fields.email} onInput={() => clearField('email')} />
    <Field label="Contact phone" name="phone" autoComplete="tel" error={fields.phone} onInput={() => clearField('phone')} />
    <Field label="School phone" name="school_phone" error={fields.school_phone} onInput={() => clearField('school_phone')} />
    <Field as="textarea" label="School address" name="address" error={fields.address} onInput={() => clearField('address')} />
    <Field label="Password" name="password" type="password" autoComplete="new-password" hint="At least 10 characters." error={fields.password} onInput={() => clearField('password')} />
    <Field label="Confirm password" name="password_confirmation" type="password" autoComplete="new-password" error={fields.password_confirmation} onInput={() => clearField('password_confirmation')} />
    <SubmitButton busy={busy} busyText="Creating account…">Create school account</SubmitButton>
    <div className="auth-switch">Already registered? <Link href="/school/login">Sign in</Link></div>
  </form></div>;
}
