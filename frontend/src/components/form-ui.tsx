'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { fieldErrors, friendlyMessage } from '@/lib/errors';
import { useToast } from './toast';

/** Submit state for a form: busy flag, a form-level error banner and per-field errors, all wired to toasts and focus. */
export function useFormRequest() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  const clear = useCallback(() => { setError(''); setFields({}); }, []);
  const clearField = useCallback((name: string) => setFields(old => { if (!old[name]) return old; const { [name]: _removed, ...rest } = old; return rest; }), []);

  const fail = useCallback((message: string, byField: Record<string, string> = {}) => {
    setError(message);
    setFields(byField);
    if (Object.keys(byField).length === 0) toast.error(message); // field problems are already explained inline
    // Move attention to the first problem so keyboard and screen-reader users land on it.
    window.setTimeout(() => {
      const bad = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      (bad ?? bannerRef.current)?.focus();
    }, 0);
  }, [toast]);

  /** Runs the request. Returns the result, or undefined after showing a clear error. */
  const run = useCallback(async <T,>(request: () => Promise<T>, options: { fallback?: string; credentials?: string } = {}): Promise<T | undefined> => {
    clear();
    setBusy(true);
    try {
      return await request();
    } catch (cause) {
      const byField = fieldErrors(cause);
      const hasFields = Object.keys(byField).length > 0;
      const message = hasFields ? 'Please fix the highlighted fields.' : options.credentials && /credentials are invalid/i.test(friendlyMessage(cause)) ? options.credentials : friendlyMessage(cause, options.fallback);
      fail(message, byField);
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [clear, fail]);

  return { busy, error, fields, formRef, bannerRef, run, fail, clear, clearField };
}

export function FormAlert({ message, bannerRef }: { message: string; bannerRef?: React.RefObject<HTMLDivElement | null> }) {
  if (!message) return null;
  return <div ref={bannerRef} className="form-alert" role="alert" tabIndex={-1}><AlertCircle size={18} aria-hidden="true" /><span>{message}</span></div>;
}

type FieldProps = {
  label: string; name: string; type?: string; error?: string; hint?: string; wide?: boolean; as?: 'input' | 'textarea';
  onInput?: () => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onInput'>;

/** Label + control + inline error wired with aria-invalid / aria-describedby. */
export function Field({ label, name, type = 'text', error, hint, wide, as = 'input', onInput, ...rest }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const common = { id, name, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, onInput };
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';
  return <div className={`form-field${wide ? ' form-wide' : ''}${error ? ' has-error' : ''}`}>
    <label htmlFor={id}>{label}</label>
    {as === 'textarea'
      ? <textarea {...common} {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      : <div className="input-wrap">
        <input {...common} type={isPassword && shown ? 'text' : type} {...rest} />
        {isPassword && <button type="button" className="input-toggle" aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown} onClick={() => setShown(v => !v)}>{shown ? <EyeOff size={18} /> : <Eye size={18} />}</button>}
      </div>}
    {error ? <small id={`${id}-err`} className="field-error">{error}</small> : hint ? <small id={`${id}-hint`} className="muted">{hint}</small> : null}
  </div>;
}

export function SubmitButton({ busy, children, busyText }: { busy: boolean; children: React.ReactNode; busyText: string }) {
  return <button className="button-primary" disabled={busy} aria-busy={busy}>{busy ? <><Loader2 size={16} className="spin" aria-hidden="true" />{busyText}</> : children}</button>;
}
