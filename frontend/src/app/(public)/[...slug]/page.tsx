import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { BlockRenderer } from '@/components/cms/block-renderer';
import { SLUG, getSite, getSitePage, vendorHost } from '@/lib/site';

// Catch-all for vendor CMS pages. Next.js always prefers real routes (products, cart, school, vendor, printing, login, …),
// so a CMS page can never shadow an application route; only otherwise-unmatched single-segment paths reach this file.
type Props = { params: Promise<{ slug: string[] }> };

async function load(slug: string[]) {
  const host = await vendorHost();
  if (!host || slug.length !== 1 || !SLUG.test(slug[0]) || slug[0] === 'home') return null;
  const page = await getSitePage(host, slug[0]);
  return page ? { host, page } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await load(slug);
  if (!found) return { title: 'Page not found' };
  const { page } = found;
  return { title: page.seo_title ? { absolute: page.seo_title } : page.title, description: page.meta_description || undefined };
}

export default async function VendorCmsPage({ params }: Props) {
  // The homepage lives at "/", not "/home".
  const { slug } = await params;
  if ((await vendorHost()) && slug.length === 1 && slug[0] === 'home') redirect('/');
  const found = await load(slug);
  if (!found) notFound();
  const site = await getSite(found.host);
  const hasHero = found.page.blocks.some(b => b.type === 'hero');
  return <>
    {!hasHero && <h1 className="cms-sr-only">{found.page.title}</h1>}
    <BlockRenderer blocks={found.page.blocks} brandColor={site?.brand_color} accentColor={site?.accent_color} />
  </>;
}
