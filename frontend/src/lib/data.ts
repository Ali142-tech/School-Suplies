export type Product = { id: string; name: string; category: string; price: number; currency?: string; rating: number; stock: number; vendor: string; vendorSlug: string; image: string; badge?: string; description: string; type?: 'supply'|'print' };
export const products: Product[] = [
 {id:'p1',name:'Classic Hardcover Notebook',category:'Notebooks',price:8.5,rating:4.8,stock:42,vendor:'Paper & Co.',vendorSlug:'paper-co',image:'photo-1531346878377-a5be20888e57',badge:'Bestseller',description:'A durable hardcover notebook with smooth, sustainably sourced paper. 192 ruled pages for notes, plans and everyday ideas.'},
 {id:'p2',name:'Everyday Graphite Pencil Set',category:'Writing',price:5.25,rating:4.7,stock:120,vendor:'The Study Shop',vendorSlug:'study-shop',image:'photo-1513364776144-60967b0f800f',description:'A set of twelve reliable HB graphite pencils, ready for class, sketching and the desk.'},
 {id:'p3',name:'Pastel Highlighter Collection',category:'Writing',price:11.9,rating:4.9,stock:18,vendor:'Paper & Co.',vendorSlug:'paper-co',image:'photo-1455390582262-044cdead8028',badge:'Popular',description:'Six soft pastel highlighters with smooth, quick-drying ink and a comfortable chisel tip.'},
 {id:'p4',name:'Canvas Pencil Case',category:'Accessories',price:14,rating:4.6,stock:25,vendor:'Northstar Office',vendorSlug:'northstar',image:'photo-1513364776144-60967b0f800f',description:'A roomy, sturdy canvas pencil case that keeps your everyday essentials neatly together.'},
 {id:'p5',name:'Premium A4 Copy Paper',category:'Paper',price:9.75,rating:4.8,stock:86,vendor:'Northstar Office',vendorSlug:'northstar',image:'photo-1455390582262-044cdead8028',description:'Bright, smooth 80gsm A4 paper for crisp printing and comfortable writing. Pack of 500 sheets.'},
 {id:'p6',name:'Color Marker Set · 24 Pack',category:'Art Supplies',price:18.5,rating:4.7,stock:31,vendor:'The Study Shop',vendorSlug:'study-shop',image:'photo-1513364776144-60967b0f800f',description:'Vivid, blendable markers in a balanced palette of 24 colors. Great for projects and creative work.'},
 {id:'p7',name:'Weekly Desk Planner',category:'Organization',price:12,rating:4.5,stock:14,vendor:'Paper & Co.',vendorSlug:'paper-co',image:'photo-1531346878377-a5be20888e57',description:'A clean undated weekly planner pad with room for priorities, notes and the little details.'},
 {id:'p8',name:'Stainless Steel Ruler',category:'Accessories',price:4.5,rating:4.4,stock:0,vendor:'Northstar Office',vendorSlug:'northstar',image:'photo-1509228468518-180dd4864904',description:'A precise 30cm stainless steel ruler with clear metric markings and a smooth edge.'},
 {id:'p9',name:'Everyday Ballpoint Pens',category:'Writing',price:7.25,rating:4.6,stock:66,vendor:'The Study Shop',vendorSlug:'study-shop',image:'photo-1455390582262-044cdead8028',description:'Ten comfortable blue ballpoint pens with a dependable medium point.'},
 {id:'p10',name:'Recycled Sticky Notes',category:'Paper',price:6.5,rating:4.5,stock:53,vendor:'Paper & Co.',vendorSlug:'paper-co',image:'photo-1531346878377-a5be20888e57',description:'Colorful recycled sticky notes for reminders, bookmarks and quick messages. Five pads.'},
 {id:'p11',name:'Scientific Calculator',category:'School Essentials',price:24.99,rating:4.9,stock:19,vendor:'Campus Supply',vendorSlug:'campus-supply',image:'photo-1509228468518-180dd4864904',badge:'Top rated',description:'A versatile scientific calculator for classroom math, science and exams.'},
 {id:'p12',name:'Compact Stapler Set',category:'Organization',price:10.5,rating:4.4,stock:37,vendor:'Northstar Office',vendorSlug:'northstar',image:'photo-1455390582262-044cdead8028',description:'A compact metal stapler with staples included, built for a tidy and reliable desk.'},
 {id:'pr1',name:'Business Cards',category:'Business Printing',price:32,rating:4.9,stock:99,vendor:'Brightprint Studio',vendorSlug:'brightprint',image:'photo-1589254065878-42c9da997008',badge:'From PKR 8,900',description:'Make a memorable first impression with crisp full-color business cards on premium stock.',type:'print'},
 {id:'pr2',name:'Event Flyers · A5',category:'Flyers & Leaflets',price:48,rating:4.8,stock:99,vendor:'Brightprint Studio',vendorSlug:'brightprint',image:'photo-1586953208448-b95a79798f07',description:'Vibrant, full-color A5 flyers for events, offers and announcements. Multiple paper stocks.',type:'print'},
 {id:'pr3',name:'Tri-fold Brochures',category:'Brochures',price:89,rating:4.7,stock:99,vendor:'Brightprint Studio',vendorSlug:'brightprint',image:'photo-1544816155-12df9643f363',description:'Tell your story with polished tri-fold brochures printed on quality, easy-to-fold stock.',type:'print'},
 {id:'pr4',name:'Custom Vinyl Banner',category:'Large Format',price:65,rating:4.8,stock:99,vendor:'Brightprint Studio',vendorSlug:'brightprint',image:'photo-1504274066651-8d31a536b11a',description:'Weather-resistant custom banners for storefronts, conferences and school events.',type:'print'},
 {id:'pr5',name:'Presentation Posters',category:'Large Format',price:22,rating:4.6,stock:99,vendor:'Citywide Print',vendorSlug:'citywide-print',image:'photo-1561070791-2526d30994b5',description:'High-resolution presentation posters in a range of sizes and finishes.',type:'print'},
 {id:'pr6',name:'Custom Letterheads',category:'Business Printing',price:55,rating:4.7,stock:99,vendor:'Citywide Print',vendorSlug:'citywide-print',image:'photo-1455390582262-044cdead8028',description:'Professional branded letterheads on elegant uncoated paper, printed to order.',type:'print'}
];
export const vendors = [{name:'Paper & Co.',slug:'paper-co',tagline:'Thoughtful paper goods for bright ideas.',color:'#eaf0ff',initial:'P',count:4},{name:'The Study Shop',slug:'study-shop',tagline:'Everyday essentials, made easy.',color:'#fff0e4',initial:'S',count:4},{name:'Northstar Office',slug:'northstar',tagline:'A better kind of workspace.',color:'#e9f6f0',initial:'N',count:4},{name:'Brightprint Studio',slug:'brightprint',tagline:'Print that makes an impression.',color:'#f5edff',initial:'B',count:4},{name:'Campus Supply',slug:'campus-supply',tagline:'Ready for every school day.',color:'#edf5ff',initial:'C',count:1},{name:'Citywide Print',slug:'citywide-print',tagline:'From first draft to final print.',color:'#fff2f0',initial:'C',count:2}];
export const categories = ['All products','Notebooks','Writing','Paper','Accessories','Art Supplies','Organization','School Essentials'];
// Mock catalog and order amounts are kept in USD as source values, then shown in PKR.
// Update this demo rate when localizing the mock data or connecting live pricing.
export const USD_TO_PKR = 278.2;
export const money = (value:number, currency = 'USD') => `PKR ${Math.round(currency === 'PKR' ? value : value * USD_TO_PKR).toLocaleString('en-PK')}`;

export type ApiProduct = {
 id: number; name: string; description: string | null; price: string | number; currency: string;
 type: 'supply' | 'print'; category?: { name: string } | null;
 vendor?: { name: string; slug: string } | null;
 inventory?: { quantity: number } | null;
 images?: { url?: string; path?: string; alt_text?: string | null }[];
 is_featured?: boolean;
};

export function mapApiProduct(item: ApiProduct): Product {
 return { id: String(item.id), name: item.name, description: item.description || '', price: Number(item.price), currency: item.currency || 'PKR', category: item.category?.name || (item.type === 'print' ? 'Printing' : 'School supplies'), rating: 0, stock: item.inventory?.quantity ?? 0, vendor: item.vendor?.name || 'Marketplace seller', vendorSlug: item.vendor?.slug || '', image: item.images?.[0]?.url || item.images?.[0]?.path || 'photo-1531346878377-a5be20888e57', badge: item.is_featured ? 'Featured' : undefined, type: item.type };
}
