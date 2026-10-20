'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/store-link';
import { apiFetch, type ApiData, type ApiPage } from '@/lib/api';

type Store = { id: number; name: string; slug: string; description?: string; logo_path?: string; settings?: { brand_color?: string; banner_path?: string } };
type Product = { id: number; name: string; slug: string; price: string; currency: string; category?: { name: string }; images?: { path: string; alt_text?: string }[] };
type Category = { id: number; name: string; slug: string };

/** Storefront home for a store addressed by `slug:{slug}` (path mode) or `host:{hostname}` (domain mode). */
export function HostnameStorefront({ store: ref }: { store: string }) {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    if (!ref) { setError('This storefront is unavailable.'); setLoading(false); return; }
    void apiFetch<ApiData<Store>>(`/v1/vendors/resolve?${ref.startsWith('slug:') ? 'slug' : 'host'}=${encodeURIComponent(ref.slice(ref.indexOf(':') + 1))}`)
      .then(async response => {
        if (!live) return;
        setStore(response.data);
        const [productResponse, categoryResponse] = await Promise.all([
          apiFetch<ApiPage<Product>>(`/v1/products?vendor=${encodeURIComponent(response.data.slug)}&per_page=48`),
          apiFetch<ApiData<Category[]>>('/v1/categories'),
        ]);
        if (live) { setProducts(productResponse.data); setCategories(categoryResponse.data); }
      })
      .catch(() => { if (live) setError('This storefront is unavailable.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [ref]);

  if (loading) return <div className="empty-products" role="status">Loading storefront…</div>;
  if (error || !store) return <div className="empty-products" role="alert"><h1>Store unavailable</h1><p>{error || 'This storefront is unavailable.'}</p><Link className="button-secondary" href="/">Back to marketplace</Link></div>;
  const brandColor = store.settings?.brand_color || '#3869d4';
  return <div>
    <section className="store-banner" style={{ backgroundColor: store.settings?.banner_path ? undefined : `${brandColor}12` }}><div className="vendor-avatar" style={{ backgroundColor: `${brandColor}20`, color: brandColor }}>{store.name.slice(0, 1).toUpperCase()}</div><div><span className="eyebrow">Independent Papertrail store</span><h1>{store.name}</h1><p>{store.description || store.name}</p></div></section>
    <section className="section"><div className="section-heading"><div><span className="eyebrow">Browse this store</span><h2>Published products</h2></div></div>
      {!!categories.length && <div className="tabs" aria-label="Marketplace categories">{categories.map(category => <span key={category.id} className="pill">{category.name}</span>)}</div>}
      {!products.length ? <div className="empty-products">This store has no published products yet.</div> : <div className="products-grid">{products.map(product => <Link className="product-card" key={product.id} href={`/products/${product.id}`}><div className="product-image" style={product.images?.[0] ? { backgroundImage: `url(${product.images[0].path})` } : undefined}/><div className="product-meta"><span>{product.category?.name || 'Supplies'}</span></div><span className="product-name">{product.name}</span><div className="product-bottom"><b>{product.currency} {Number(product.price).toLocaleString()}</b></div></Link>)}</div>}
    </section>
  </div>;
}
