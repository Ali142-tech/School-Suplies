'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/ui';
import { apiFetch, type ApiData, type ApiPage, useMockData } from '@/lib/api';
import { mapApiProduct, products as mockProducts, type ApiProduct, type Product, vendors as mockVendors } from '@/lib/data';

type Vendor = { id: number; name: string; slug: string; description?: string | null; settings?: { brand_color?: string | null } | null };
export default function Storefront() {
 const { slug } = useParams<{slug:string}>();
 const [vendor,setVendor]=useState<Vendor|null>(null),[items,setItems]=useState<Product[]>([]);
 const [status,setStatus]=useState<'loading'|'ready'|'empty'|'error'>('loading'),[error,setError]=useState('');
 async function load() {
  setStatus('loading'); setError('');
  try {
   const [store, products] = await Promise.all([
    apiFetch<ApiData<Vendor>>(`/v1/vendors/${encodeURIComponent(slug)}`),
    apiFetch<ApiPage<ApiProduct>>(`/v1/products?vendor=${encodeURIComponent(slug)}&per_page=100`),
   ]);
   setVendor(store.data); setItems(products.data.map(mapApiProduct)); setStatus('ready');
  } catch (cause) {
   if (useMockData) {
    const fallback=mockVendors.find(v=>v.slug===slug);
    if(fallback){setVendor({id:0,name:fallback.name,slug:fallback.slug,description:fallback.tagline,settings:{brand_color:fallback.color}});setItems(mockProducts.filter(p=>p.vendorSlug===slug));setStatus('ready');return;}
   }
   setError(cause instanceof Error?cause.message:'Could not load this store.');setStatus('error');
  }
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{void load();},[slug]);
 if(status==='loading')return <div className="empty-state" role="status"><h2>Loading store…</h2></div>;
 if(status==='error'||!vendor)return <div className="empty-state" role="alert"><h2>{error||'This store is unavailable.'}</h2><button className="button-secondary" onClick={()=>void load()}>Try again</button> <Link className="button-primary" href="/stores">All stores</Link></div>;
 const products=items.filter(p=>p.type!=='print');
 return <><div className="store-banner"><span className="vendor-avatar" style={{background:vendor.settings?.brand_color||'#eaf0ff'}}>{vendor.name.charAt(0)}</span><div><span className="eyebrow">Independent store</span><h1>{vendor.name}</h1><p>{vendor.description||'Thoughtful goods from an independent seller.'}</p></div><Link className="button-secondary" href="/stores" style={{marginLeft:'auto'}}>All stores</Link></div><div className="section"><div className="tabs"><Link href="#products">Products ({products.length})</Link><Link href="#about">About the store</Link></div><h2 id="products" style={{font:'700 23px Manrope'}}>Shop {vendor.name}</h2>{products.length?<div className="products-grid" style={{marginTop:20}}>{products.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<p className="muted">This store is preparing its first products.</p>}<div id="about" className="panel" style={{marginTop:40}}><h3 className="panel-title">A note from {vendor.name}</h3><p className="muted" style={{lineHeight:1.8}}>{vendor.description||'We’re pleased to be part of a marketplace bringing together useful, well-made goods from independent sellers.'}</p></div></div></>;
}



