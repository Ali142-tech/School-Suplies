'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch, type ApiPage, useMockData } from '@/lib/api';
import { vendors as mockVendors } from '@/lib/data';

type Vendor = { id: number; name: string; slug: string; description?: string | null; logo_path?: string | null };
export default function Stores() {
 const [vendors, setVendors] = useState<Vendor[]>([]);
 const [status, setStatus] = useState<'loading'|'ready'|'error'>('loading');
 const [error, setError] = useState('');
 async function load() {
  setStatus('loading'); setError('');
  try { const page = await apiFetch<ApiPage<Vendor>>('/v1/vendors'); setVendors(page.data); setStatus('ready'); }
  catch (cause) { if (useMockData) { setVendors(mockVendors.map((v, i) => ({ ...v, id: i + 1, description: v.tagline }))); setStatus('ready'); } else { setError(cause instanceof Error ? cause.message : 'Could not load stores.'); setStatus('error'); } }
 }
 useEffect(() => { void load(); }, []);
 return <div className="section"><span className="eyebrow">Independent sellers, considered goods</span><h1 style={{font:'700 30px Manrope',margin:'9px 0 10px'}}>Meet the stores</h1><p className="muted">Find your next favorite from the people behind the products.</p>{status==='loading'?<div className="empty-products" role="status">Loading stores…</div>:status==='error'?<div className="empty-products" role="alert">{error}<br/><button className="text-link" onClick={()=>void load()}>Try again</button></div>:vendors.length===0?<div className="empty-products">No stores are available yet.</div>:<div className="vendor-row" style={{gridTemplateColumns:'repeat(3,1fr)',marginTop:32}}>{vendors.map(v=><Link href={`/store/${v.slug}`} key={v.slug} className="panel" style={{display:'flex',gap:14,alignItems:'center',margin:0}}><span className="vendor-avatar" style={{background:'#eaf0ff',width:54,height:54}}>{v.name.charAt(0)}</span><span><b>{v.name}</b><small style={{display:'block',color:'#8290a0',marginTop:5}}>{v.description || 'Independent marketplace store'}</small><small style={{display:'block',color:'#3869d4',marginTop:8}}>Visit store →</small></span></Link>)}</div>}</div>;
}
