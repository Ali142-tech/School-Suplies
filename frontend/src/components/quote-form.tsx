'use client';

import { useState } from 'react';
import { ArrowRight, Check, Printer } from 'lucide-react';
import { apiFetch, type ApiData } from '@/lib/api';

type Quote = { reference: string };
export function QuoteForm() {
  const [submitted, setSubmitted] = useState('');
  const [fileError, setFileError] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSending(true);
    const form = event.currentTarget;
    const values = new FormData(form);
    const payload = new FormData();
    for (const key of ['contact_name', 'email', 'product_type', 'quantity', 'size', 'paper_type', 'finish', 'notes']) {
      const value = values.get(key);
      if (value instanceof File) continue;
      if (typeof value === 'string' && value.trim()) payload.append(key, value.trim());
    }
    const artwork = values.get('artwork');
    if (artwork instanceof File && artwork.size > 0) payload.append('artwork', artwork);
    try {
      const response = await apiFetch<ApiData<Quote>>('/v1/printing/quotes', { method: 'POST', body: payload });
      setSubmitted(response.data.reference || 'received');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send the quote request.');
    } finally { setSending(false); }
  }

  if (submitted) return <div className="form-card empty-state" role="status" style={{ padding: '35px 10px' }}><span className="eyebrow">Request received</span><h2>Thanks — we have your brief.</h2><p>Your quote reference is {submitted}.</p></div>;

  return <form className="form-card" onSubmit={submit}>
    <h2>Request a custom print quote</h2>
    <p className="muted" style={{ fontSize: 11 }}>Share a few details and our print team will help you find the right fit.</p>
    <div className="form-grid">
      <div className="form-field"><label htmlFor="qname">Your name</label><input id="qname" name="contact_name" required /></div>
      <div className="form-field"><label htmlFor="qemail">Email</label><input id="qemail" name="email" type="email" required /></div>
      <div className="form-field"><label htmlFor="qtype">What are you printing?</label><select id="qtype" name="product_type"><option>Business cards</option><option>Flyers or leaflets</option><option>Brochures</option><option>Banners or posters</option><option>Something else</option></select></div>
      <div className="form-field"><label htmlFor="qquantity">Estimated quantity</label><input id="qquantity" name="quantity" type="number" min="1" placeholder="e.g. 500" required /></div>
      <div className="form-field"><label htmlFor="qsize">Size</label><select id="qsize" name="size"><option>Standard / not sure</option><option>A4</option><option>A5</option><option>Custom size</option></select></div>
      <div className="form-field"><label htmlFor="qpaper">Paper / material</label><select id="qpaper" name="paper_type"><option>Recommend a stock</option><option>Uncoated</option><option>Silk</option><option>Gloss</option><option>Vinyl</option></select></div>
      <div className="form-field form-wide"><label htmlFor="qfinish">Finishing</label><select id="qfinish" name="finish"><option value="">Recommend a finish</option><option>Matte</option><option>Gloss</option></select></div>
      <div className="form-field form-wide"><label htmlFor="qnotes">Finishing and project details</label><textarea id="qnotes" name="notes" placeholder="Tell us about your project, finish or deadline" /></div>
      <div className="form-wide file-drop"><Printer size={20} /><br /><label htmlFor="artwork">Artwork (optional) · PDF, PNG or JPG up to 10 MB</label><input id="artwork" name="artwork" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={event => { const file = event.currentTarget.files?.[0]; const validTypes = ['application/pdf', 'image/png', 'image/jpeg']; const invalid = !!file && (file.size > 10 * 1024 * 1024 || !validTypes.includes(file.type)); setFileError(invalid ? 'Choose a PDF, PNG or JPG file under 10 MB.' : ''); if (invalid) event.currentTarget.value = ''; }} />{fileError&&<p role="alert" style={{color:'#b44343'}}>{fileError}</p>}</div>
    </div>
    {error && <p role="alert" style={{ color: '#b44343' }}>{error}</p>}
    <button className="button-primary" style={{ marginTop: 16 }} disabled={sending}>{sending ? 'Sending…' : 'Send quote request'} {!sending && <ArrowRight size={15} />}</button>
    <p className="muted" style={{ fontSize: 10, display: 'flex', gap: 6, alignItems: 'center' }}><Check size={13} /> Your request is sent securely to the printing team.</p>
  </form>;
}
