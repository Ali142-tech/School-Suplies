'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { ExternalLink, FileText, LayoutDashboard, LogOut, Menu, Package, PackageCheck, Palette, Printer, Receipt, School, Settings, UserRound, X } from 'lucide-react';
import { apiFetch, clearAccessToken, hasAccessToken, type ApiData } from '@/lib/api';

export type ShellVendor = { id: number; name: string; slug: string; status: string };
export type ShellUser = { id: number; name: string; email: string; role: string; vendor_memberships?: { role: string; vendor: ShellVendor }[] };
type Session = { user: ShellUser; vendor: ShellVendor; role: string };

const SessionContext = createContext<Session | null>(null);
export function useVendorSession() { return useContext(SessionContext); }

const nav = [
  { label: 'Overview', href: '/vendor/dashboard', icon: LayoutDashboard },
  { label: 'Products & inventory', href: '/vendor/products', icon: Package },
  { label: 'Printing services', href: '/vendor/printing', icon: Printer },
  { label: 'Orders', href: '/vendor/orders', icon: Receipt },
  { label: 'Schools & customers', href: '/vendor/schools', icon: School },
  { label: 'Website pages', href: '/vendor/pages', icon: FileText },
  { label: 'Website settings', href: '/vendor/website', icon: Palette },
  { label: 'Store & domain', href: '/vendor/store-settings', icon: Settings },
  { label: 'Profile', href: '/vendor/profile', icon: UserRound },
];

export function VendorShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);

  // Authorization stays in Laravel; this only decides whether to render the shell or send the visitor to sign in.
  useEffect(() => {
    let active = true;
    if (!hasAccessToken()) { router.replace('/vendor/login'); return; }
    apiFetch<ApiData<ShellUser>>('/v1/auth/me').then(({ data }) => {
      if (!active) return;
      const membership = data.vendor_memberships?.[0];
      const vendor = membership?.vendor;
      if (!membership || !vendor) { router.replace('/vendor/login'); return; }
      setSession({ user: data, vendor, role: membership.role });
    }).catch(() => { if (!active) return; clearAccessToken(); router.replace('/vendor/login'); });
    return () => { active = false; };
  }, [router]);

  useEffect(() => { setOpen(false); }, [path]);

  async function signOut() {
    try { await apiFetch('/v1/auth/logout', { method: 'POST' }); } catch { /* token is discarded either way */ }
    clearAccessToken();
    router.replace('/vendor/login');
  }

  if (!session) return <div className="vx-loading" role="status">Loading your workspace…</div>;
  const { user, vendor } = session;
  const isActive = (href: string) => href === '/vendor/dashboard' ? path === href : path === href || path.startsWith(`${href}/`);

  return <SessionContext.Provider value={session}>
    <div className="vx-shell">
      {open && <div className="vx-overlay" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className={`vx-sidebar${open ? ' open' : ''}`} aria-label="Vendor navigation">
        <div className="vx-sidebar-top">
          <Link href="/vendor/dashboard" className="vx-brand"><span className="brand-icon"><PackageCheck size={20} /></span><span>paper<span className="brand-light">trail</span><small>VENDOR</small></span></Link>
          <button className="vx-icon-btn vx-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav className="vx-nav">
          {nav.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className={isActive(href) ? 'active' : ''} aria-current={isActive(href) ? 'page' : undefined}><Icon size={17} />{label}</Link>)}
        </nav>
        <button className="vx-signout" onClick={() => void signOut()}><LogOut size={17} />Sign out</button>
      </aside>
      <div className="vx-main">
        <header className="vx-header">
          <button className="vx-icon-btn vx-burger" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="vx-store"><b>{vendor.name}</b><span className={`vx-badge ${vendor.status}`}>{vendor.status}</span></div>
          <div className="vx-header-actions">
            {vendor.status === 'active' && <Link className="button-secondary vx-view" href={`/store/${vendor.slug}`} target="_blank"><ExternalLink size={14} /><span>View store</span></Link>}
            <Link className="vx-user" href="/vendor/profile"><UserRound size={16} /><span>{user.name}</span></Link>
          </div>
        </header>
        <main className="vx-content">{children}</main>
      </div>
    </div>
  </SessionContext.Provider>;
}
