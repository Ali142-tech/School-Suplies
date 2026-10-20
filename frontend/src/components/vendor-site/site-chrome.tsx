import Link from '@/components/store-link';
import { SafeImage } from '@/components/cms/safe-image';
import { SafeLink } from '@/components/cms/rich-text';
import { HEX } from '@/lib/cms';
import type { Site } from '@/lib/site';
import { SiteNav } from './site-nav';

/** Header, footer and brand theme for a vendor's own website. Used on verified vendor domains instead of the marketplace chrome. */
export function VendorSiteChrome({ site, children }: { site: Site; children: React.ReactNode }) {
  const style = { ...(site.brand_color && HEX.test(site.brand_color) ? { '--cms-brand': site.brand_color } : {}), ...(site.accent_color && HEX.test(site.accent_color) ? { '--cms-accent': site.accent_color } : {}) } as React.CSSProperties;
  // Vendor-chosen menu if present; otherwise the published pages. The store's own shop and printing sections are always reachable.
  const base = site.navigation.length ? site.navigation : site.pages.filter(p => p.kind !== 'home').map(p => ({ label: p.title, url: p.path }));
  const listed = (url: string) => base.some(item => item.url === url || item.url.startsWith(`${url}/`));
  const items = [...base, ...(listed('/products') ? [] : [{ label: 'Shop', url: '/products' }]), ...(listed('/printing') ? [] : [{ label: 'Printing', url: '/printing' }])];
  const initial = site.name.trim().slice(0, 1).toUpperCase() || '•';
  return <div className="vs-root" style={style}>
    <a className="vs-skip" href="#vs-content">Skip to content</a>
    <header className="vs-header">
      <div className="vs-bar">
        <Link className="vs-brand" href="/">
          <SafeImage src={site.logo_url} alt="" className="vs-logo" fallback={<span className="vs-mark" aria-hidden="true">{initial}</span>} />
          <span className="vs-name">{site.name}</span>
        </Link>
        <SiteNav items={items} action={{ label: 'School login', url: '/school/login' }} />
      </div>
    </header>
    <main id="vs-content" className="vs-main">{children}</main>
    <footer className="vs-footer">
      <div className="vs-footer-inner">
        <div>
          <b>{site.name}</b>
          {site.footer.text && <p className="vs-footer-text">{site.footer.text}</p>}
        </div>
        {site.footer.links.length > 0 && <nav aria-label="Footer" className="vs-footer-links">{site.footer.links.map(l => <SafeLink key={l.url + l.label} href={l.url}>{l.label}</SafeLink>)}</nav>}
      </div>
      <div className="vs-footer-bottom">© {new Date().getFullYear()} {site.name}</div>
    </footer>
  </div>;
}
