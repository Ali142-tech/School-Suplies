'use client';
import Link from '@/components/store-link';
import { ArrowRight, Heart, Star } from 'lucide-react';
import type { Product } from '@/lib/data';
import { money } from '@/lib/data';
import { useStore } from './store';
export function ProductCard({product}:{product:Product}){const {add}=useStore();const image=product.image.startsWith('http')?product.image:`https://images.unsplash.com/${product.image}?auto=format&fit=crop&w=640&q=80`;return <article className="product-card"><Link href={`/products/${product.id}`} className="product-image" style={{backgroundImage:`url(${image})`}}>{product.badge&&<span className="badge">{product.badge}</span>}<button className="wish" aria-label="Save item" onClick={e=>{e.preventDefault();e.currentTarget.classList.toggle('saved')}}><Heart size={17}/></button></Link><div className="product-meta"><span>{product.category}</span><span>{product.rating > 0 && <><Star size={13} fill="currentColor"/> {product.rating}</>}</span></div><Link href={`/products/${product.id}`} className="product-name">{product.name}</Link><div className="product-bottom"><b>{money(product.price, product.currency)}</b><button className="add-quick" onClick={()=>add(product)} aria-label={`Add ${product.name} to cart`}>+</button></div></article>}
export function SectionHeading({eyebrow,title,link,href}:{eyebrow:string,title:string,link?:string,href?:string}){return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{link&&<Link className="text-link" href={href||'/products'}>{link}<ArrowRight size={16}/></Link>}</div>}
