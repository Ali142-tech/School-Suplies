import type { Metadata } from 'next';
import { BlockRenderer } from '@/components/cms/block-renderer';
import { HostnameStorefront } from '@/components/hostname-storefront';
import { getSite, getSitePage, vendorHost } from '@/lib/site';

// Vendor homepage. A published CMS "Home" page is shown when there is one; otherwise the existing product storefront.
async function home() {
  const host = await vendorHost();
  if (!host) return { host: '', page: null };
  try { return { host, page: await getSitePage(host, 'home') }; } catch { return { host, page: null }; }
}

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await home();
  if (!page) return {};
  return { title: page.seo_title ? { absolute: page.seo_title } : undefined, description: page.meta_description || undefined };
}

export default async function TenantStorefrontPage() {
  const { host, page } = await home();
  if (page) {
    const site = await getSite(host);
    const hasHero = page.blocks.some(b => b.type === 'hero');
    return <>
      {!hasHero && <h1 className="cms-sr-only">{page.title}</h1>}
      <BlockRenderer blocks={page.blocks} brandColor={site?.brand_color} accentColor={site?.accent_color} />
    </>;
  }
  return <HostnameStorefront host={host} />;
}
