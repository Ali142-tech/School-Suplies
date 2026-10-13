import type { Metadata } from 'next';
import { Header, Footer } from '@/components/shell';
import { VendorSiteChrome } from '@/components/vendor-site/site-chrome';
import { currentSite } from '@/lib/site';

// On a verified vendor domain every route in this group is wrapped in that vendor's own header/footer and metadata;
// everywhere else (the marketplace, unknown or inactive hosts) the marketplace chrome is used unchanged.
export async function generateMetadata(): Promise<Metadata> {
  const site = await currentSite();
  if (!site) return {};
  return {
    title: { default: site.seo.title || site.name, template: `%s | ${site.name}` },
    description: site.seo.description || site.description || undefined,
    icons: site.logo_url ? { icon: site.logo_url } : undefined,
  };
}

export default async function PublicLayout({children}:{children:React.ReactNode}){
  const site = await currentSite();
  if (site) return <VendorSiteChrome site={site}>{children}</VendorSiteChrome>;
  return <><Header/><main>{children}</main><Footer/></>;
}
