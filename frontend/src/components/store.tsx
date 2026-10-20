'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/data';
import { useToast } from './toast';
import { useStoreSlug } from './store-link';
type Line = { product: Product; quantity: number };
type Store = { items: Line[]; add: (p:Product)=>void; setQuantity:(id:string,n:number)=>void; remove:(id:string)=>void; clear:()=>void };
const StoreContext = createContext<Store|null>(null);
export function StoreProvider({children}:{children:React.ReactNode}) {
 const toast=useToast();
 const [items,setItems]=useState<Line[]>([]),[loadedKey,setLoadedKey]=useState('');
 const slug=useStoreSlug(),cartKey=slug?`printinf-cart:${slug}`:'printinf-cart';   // one cart per storefront: a path-mode store never sees another store's lines
 useEffect(()=>{let loaded:Line[]=[];try{const raw=localStorage.getItem(cartKey);if(raw)loaded=JSON.parse(raw);}catch{}setItems(loaded);setLoadedKey(cartKey);},[cartKey]);
 useEffect(()=>{if(loadedKey===cartKey)localStorage.setItem(cartKey,JSON.stringify(items));},[items,loadedKey,cartKey]);
 const value=useMemo<Store>(()=>({items,clear:()=>setItems([]),add:(p)=>{if(p.stock===0){toast.error('This item is currently out of stock.');return;}setItems(old=>{const found=old.find(x=>x.product.id===p.id);return found?old.map(x=>x.product.id===p.id?{...x,quantity:x.quantity+1}:x):[...old,{product:p,quantity:1}]});toast.success(`${p.name} added to your cart`);},setQuantity:(id,n)=>setItems(old=>old.map(x=>x.product.id===id?{...x,quantity:Math.max(1,n)}:x)),remove:(id)=>setItems(old=>old.filter(x=>x.product.id!==id))}),[items,toast]);
 return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore(){const value=useContext(StoreContext);if(!value)throw new Error('useStore must be used within StoreProvider');return value;}
