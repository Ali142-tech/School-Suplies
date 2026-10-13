'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProductCard, SectionHeading } from '@/components/ui';
import { apiFetch, type ApiPage, useMockData } from '@/lib/api';
import { mapApiProduct, products as mockProducts, type ApiProduct, type Product, vendors as mockVendors } from '@/lib/data';

type Vendor={id:number;name:string;slug:string;description?:string|null};
export function HomeMarketplace(){
 const [items,setItems]=useState<Product[]>([]),[vendors,setVendors]=useState<Vendor[]>([]),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[error,setError]=useState('');
 async function load(){setStatus('loading');setError('');try{const [products,vendorPage]=await Promise.all([apiFetch<ApiPage<ApiProduct>>('/v1/products?per_page=100&sort=created_at&direction=desc'),apiFetch<ApiPage<Vendor>>('/v1/vendors')]);setItems(products.data.map(mapApiProduct).filter(p=>p.type!=='print').slice(0,4));setVendors(vendorPage.data.slice(0,4));setStatus('ready');}catch(cause){if(useMockData){setItems(mockProducts.filter(p=>p.type!=='print').slice(0,4));setVendors(mockVendors.slice(0,4).map((v,i)=>({...v,id:i+1,description:v.tagline})));setStatus('ready');}else{setError(cause instanceof Error?cause.message:'Could not load marketplace data.');setStatus('error');}}}
 useEffect(()=>{void load();},[]);
 return <>{<section className="section section-soft"><SectionHeading eyebrow="The things you’ll reach for" title="Customer favorites" link="Shop all supplies"/>{status==='loading'?<div className="empty-products" role="status">Loading products…</div>:status==='error'?<div className="empty-products" role="alert">{error}<br/><button className="text-link" onClick={()=>void load()}>Try again</button></div>:items.length?<div className="products-grid">{items.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="empty-products">No products are available yet.</div>}</section>}{status==='ready'&&<section className="section section-soft"><SectionHeading eyebrow="Good people, good products" title="Meet the stores" link="All our stores" href="/stores"/><div className="vendor-row">{vendors.map(v=><Link key={v.slug} href={`/store/${v.slug}`} className="vendor-card"><span className="vendor-avatar" style={{background:'#eaf0ff'}}>{v.name.charAt(0)}</span><span><b>{v.name}</b><small>{v.description||'Independent seller'}</small></span></Link>)}</div></section>}</>;
}
