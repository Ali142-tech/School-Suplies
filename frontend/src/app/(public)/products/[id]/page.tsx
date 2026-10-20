'use client';

import { storefrontHref } from '@/lib/storefront';
import Link from '@/components/store-link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Star } from 'lucide-react';
import { mapApiProduct, products as mockProducts, type ApiProduct, type Product, money } from '@/lib/data';
import { apiFetch, type ApiData, useMockData } from '@/lib/api';
import { useStore } from '@/components/store';
import { ProductCard } from '@/components/ui';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading');
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const { add } = useStore();

  useEffect(() => {
    let active = true;
    setStatus('loading');
    apiFetch<ApiData<ApiProduct>>(`/v1/products/${encodeURIComponent(id)}`).then(({ data }) => {
      if (!active) return;
      const mapped = mapApiProduct(data);
      setProduct(mapped);
      setRelated([]);
      setStatus('ready');
    }).catch(cause => {
      if (!active) return;
      if (useMockData) {
        const fallback = mockProducts.find(item => item.id === id);
        if (fallback) { setProduct(fallback); setRelated(mockProducts.filter(item => item.category === fallback.category && item.id !== fallback.id).slice(0, 4)); setStatus('ready'); return; }
      }
      setError(cause instanceof Error ? cause.message : 'Could not load this product.');
      setStatus(cause && typeof cause === 'object' && 'status' in cause && cause.status === 404 ? 'missing' : 'error');
    });
    return () => { active = false; };
  }, [id]);

  if (status === 'loading') return <div className="empty-state" role="status"><h2>Loading product…</h2></div>;
  if (status === 'error' || status === 'missing' || !product) return <div className="empty-state" role={status === 'error' ? 'alert' : undefined}><h2>{status === 'missing' ? 'We couldn’t find that product.' : error}</h2><Link className="button-primary" href="/products">Back to shop</Link></div>;

  const image = product.image.startsWith('http') ? product.image : `https://images.unsplash.com/${product.image}?auto=format&fit=crop&w=900&q=85`;
  return <div className="section"><Link className="text-link" href="/products"><ArrowLeft size={15}/> Back to shop</Link><div className="product-detail" style={{ marginTop: 25 }}><div className="detail-image" style={{ backgroundImage: `url(${image})` }}/><div className="detail-copy"><span className="eyebrow">{product.category}</span><h1>{product.name}</h1><div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ae803b', fontSize: 12 }}>{product.rating > 0 && <><Star size={14} fill="currentColor"/>{product.rating}</>} <span className="muted"> · Thoughtfully selected</span></div><div className="detail-price">{money(product.price, product.currency)}</div><p className="detail-description">{product.description}</p><div className="stock">{product.stock > 0 ? <><Check size={14} style={{ verticalAlign: 'middle' }}/> {product.stock < 20 ? 'Only a few left' : 'In stock'} — ready to ship</> : 'Currently out of stock'}</div><Link className="vendor-chip" href={storefrontHref({ slug: product.vendorSlug })}>Sold by <b>{product.vendor}</b> <span style={{ float: 'right', color: '#3869d4' }}>Visit store →</span></Link><div className="quantity"><button onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span>{qty}</span><button onClick={() => setQty(qty + 1)}>+</button></div><div className="detail-actions"><button className="button-primary" disabled={!product.stock} onClick={() => { for (let i = 0; i < qty; i++) add(product); }}>Add to cart · {money(qty * product.price, product.currency)}</button></div><p className="muted" style={{ fontSize: 10, marginTop: 16 }}>Product details and stock from the marketplace.</p></div></div>{related.length > 0 && <section style={{ marginTop: 70 }}><h2 style={{ font: '700 23px Manrope', marginBottom: 25 }}>A few more good finds</h2><div className="products-grid">{related.map(item => <ProductCard key={item.id} product={item}/>)}</div></section>}</div>;
}
