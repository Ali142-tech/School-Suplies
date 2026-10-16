'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProductCard } from '@/components/ui';
import { categories as mockCategories, mapApiProduct, products as mockProducts, USD_TO_PKR, type ApiProduct, type Product } from '@/lib/data';
import { apiFetch, type ApiPage, type ApiData, useMockData } from '@/lib/api';

type ApiCategory = { id: number; name: string; slug: string };

export default function Catalog({ initialCategory }: { initialCategory: string }) {
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('featured');
  const [max, setMax] = useState('27820');
  const [items, setItems] = useState<Product[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>(useMockData ? mockCategories : ['All products']);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  async function load() {
    setStatus('loading'); setError('');
    try {
      const [page, cats] = await Promise.all([
        apiFetch<ApiPage<ApiProduct>>('/v1/products?per_page=100&sort=created_at&direction=desc'),
        apiFetch<ApiData<ApiCategory[]>>('/v1/categories'),
      ]);
      setItems(page.data.map(mapApiProduct).filter(p => p.type !== 'print'));
      setCategoryNames(['All products', ...cats.data.map(c => c.name)]);
      setStatus('ready');
    } catch (cause) {
      if (useMockData) { setItems(mockProducts.filter(p => p.type !== 'print')); setCategoryNames(mockCategories); setStatus('ready'); }
      else { setError(cause instanceof Error ? cause.message : 'Could not load products.'); setStatus('error'); }
    }
  }

  useEffect(() => { void load(); }, []);
  const shown = useMemo(() => {
    const list = items.filter(p => (category === 'All products' || p.category === category) && p.name.toLowerCase().includes(query.toLowerCase()) && p.price * (p.currency === 'PKR' ? 1 : USD_TO_PKR) <= Number(max));
    if (sort === 'price-low') list.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') list.sort((a, b) => b.price - a.price);
    return list;
  }, [items, category, query, sort, max]);

  return <div className="section"><div className="section-heading"><div><span className="eyebrow">Made for the school day and beyond</span><h2>Shop all supplies</h2></div><input className="form-control" placeholder="Search products…" value={query} onChange={event => setQuery(event.target.value)} aria-label="Search products" /></div><div className="catalog-layout"><aside className="filter-panel"><h3>Categories</h3>{categoryNames.map(item => <label key={item}><input type="radio" checked={category === item} onChange={() => setCategory(item)} />{item}</label>)}<div className="filter-block"><h3>Price range</h3><label>Up to <select value={max} onChange={event => setMax(event.target.value)} className="form-control"><option value="27820">PKR 27,820</option><option value="5564">PKR 5,564</option><option value="2782">PKR 2,782</option></select></label></div><div className="filter-block"><span className="muted">{useMockData ? 'Development sample inventory' : 'Live marketplace inventory'}</span></div></aside><div><div className="catalog-toolbar"><p>{status === 'ready' ? `${shown.length} products` : 'Products'}</p><select aria-label="Sort products" value={sort} onChange={event => setSort(event.target.value)} className="form-control"><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></div>{status === 'loading' ? <div className="empty-products" role="status">Loading products…</div> : status === 'error' ? <div className="empty-products" role="alert">{error}<br/><button className="text-link" onClick={() => void load()}>Try again</button></div> : shown.length ? <div className="products-grid">{shown.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-products">No products match those filters. Try another category or search.</div>}</div></div></div>;
}
