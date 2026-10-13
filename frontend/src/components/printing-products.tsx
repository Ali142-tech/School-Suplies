'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/ui';
import { apiFetch, type ApiPage, useMockData } from '@/lib/api';
import { mapApiProduct, products as mockProducts, type ApiProduct, type Product } from '@/lib/data';

export function PrintingProducts() {
 const [items,setItems]=useState<Product[]>([]),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[error,setError]=useState('');
 async function load(){setStatus('loading');setError('');try{const page=await apiFetch<ApiPage<ApiProduct>>('/v1/printing/products');setItems(page.data.map(mapApiProduct));setStatus('ready');}catch(cause){if(useMockData){setItems(mockProducts.filter(p=>p.type==='print'));setStatus('ready');}else{setError(cause instanceof Error?cause.message:'Could not load print products.');setStatus('error');}}}
 useEffect(()=>{void load();},[]);
 if(status==='loading')return <div className="empty-products" role="status">Loading print products…</div>;
 if(status==='error')return <div className="empty-products" role="alert">{error}<br/><button className="text-link" onClick={()=>void load()}>Try again</button></div>;
 return items.length?<div className="products-grid">{items.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="empty-products">No print products are available yet.</div>;
}
