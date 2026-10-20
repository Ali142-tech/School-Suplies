'use client';

import { storefrontHref } from '@/lib/storefront';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ExternalLink, FileText, LayoutDashboard, LogOut, Menu, Package, PackageCheck, Palette, Printer, Receipt, School, Settings, Tags, UserRound, Users, X } from 'lucide-react';
import { apiFetch, clearAccessToken, hasAccessToken, type ApiData } from '@/lib/api';
import { Banner, Spinner, titleCase } from './vendor/ui';

export type ShellVendor = { id: number; name: string; slug: string; status: string; logo_url?: string | null; rejection_reason?: string | null };
export type ShellUser = { id: number; name: string; email: string; phone?: string | null; role: string; vendor_memberships?: { role: string; vendor: ShellVendor }[] };
type Session = { user: ShellUser; vendor: ShellVendor; role: string; reload: () => Promise<void> };

const SessionContext = createContext<Session | null>(null);
export function useVendorSession() { return useContext(SessionContext); }

const groups = [
  { label: 'Store', items: [
    { label: 'Overview', href: '/vendor/dashboard', icon: LayoutDashboard },
    { label: 'Products', href: '/vendor/products', icon: Package },
    { label: 'Categories', href: '/vendor/categories', icon: Tags },
    { label: 'Orders', href: '/vendor/orders', icon: Receipt },
    { label: 'Printing quotes', href: '/vendor/printing', icon: Printer },
  ] },
  { label: 'Website (CMS)', items: [
    { label: 'Pages', href: '/vendor/pages', icon: FileText },
    { label: 'Appearance', href: '/vendor/website', icon: Palette },
  ] },
  { label: 'Account', items: [
    { label: 'School customers', href: '/vendor/schools', icon: School },
    { label: 'Team', href: '/vendor/team', icon: Users },
    { label: 'Store settings', href: '/vendor/store-settings', icon: Settings },
    { label: 'My profile', href: '/vendor/profile', icon: UserRound },
  ] },
];
const flat = groups.flatMap(g => g.items);

type Note = { id: string; read_at: string | null; created_at: string; data?: { title?: string; message?: string } };

export function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const load = useCallback(() => { void apiFetch<{ data: { data: Note[] } }>('/v1/notifications').then(r => setItems(r.data?.data ?? [])).catch(() => undefined); }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  const unread = items.filter(i => !i.read_at).length;
  function read(note: Note) {
    if (note.read_at) return;
    void apiFetch(`/v1/notifications/${note.id}`, { method: 'PATCH' }).then(() => setItems(cur => cur.map(n => n.id === note.id ? { ...n, read_at: new Date().toISOString() } : n))).catch(() => undefined);
  }
  return <div className="vp-pop" ref={ref}>
    <button className="btn ghost icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} onClick={() => { setOpen(v => !v); if (!open) load(); }}><Bell size={19} />{unread > 0 && <span className="vp-bell-dot" />}</button>
    {open && <div className="vp-pop-panel"><header>Notifications {unread > 0 && <span className="vp-badge info">{unread} new</span>}</header>
      <div className="vp-pop-list">{items.length === 0 ? <div className="vp-empty" style={{ padding: 28 }}>You’re all caught up.</div> : items.map(n => <button key={n.id} className={`vp-note${n.read_at ? '' : ' unread'}`} onClick={() => read(n)}><b>{n.data?.title || 'Update'}</b><span>{n.data?.message}</span></button>)}</div>
    </div>}
  </div>;
}

export function VendorShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [data, setData] = useState<Omit<Session, 'reload'> | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await apiFetch<ApiData<ShellUser>>('/v1/auth/me');
    const membership = data.vendor_memberships?.[0];
    if (!membership?.vendor) throw new Error('no-vendor');
    setData({ user: data, vendor: membership.vendor, role: membership.role });
  }, []);

  // Authorization stays in Laravel; this only decides whether to render the shell or send the visitor to sign in.
  useEffect(() => {
    let active = true;
    if (!hasAccessToken()) { router.replace('/vendor/login'); return; }
    load().catch(() => { if (!active) return; clearAccessToken(); router.replace('/vendor/login'); });
    return () => { active = false; };
  }, [router, load]);
  const session = useMemo<Session | null>(() => data && { ...data, reload: load }, [data, load]);
  useEffect(() => { setOpen(false); }, [path]);

  async function signOut() {
    try { await apiFetch('/v1/auth/logout', { method: 'POST' }); } catch { /* token is discarded either way */ }
    clearAccessToken();
    router.replace('/vendor/login');
  }

  if (!session) return <div className="vp-loading" role="status"><Spinner size={26} /><span>Loading your workspace…</span></div>;
  const { user, vendor } = session;
  const isActive = (href: string) => href === '/vendor/dashboard' ? path === href : path === href || path.startsWith(`${href}/`);
  const current = flat.find(i => isActive(i.href));

  return <SessionContext.Provider value={session}>
    <div className="vp-shell">
      {open && <div className="vp-overlay" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className={`vp-sidebar${open ? ' open' : ''}`} aria-label="Vendor navigation">
        <button className="btn ghost icon vp-sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={19} /></button>
        <Link href="/vendor/dashboard" className="vp-logo"><i><PackageCheck size={19} /></i><span>papertrail <small>VENDOR</small></span></Link>
        <div className="vp-store-card">
          <span className="vp-avatar">{vendor.logo_url ? <img src={vendor.logo_url} alt="" /> : vendor.name.slice(0, 1)}</span>
          <div><b>{vendor.name}</b><small>/{vendor.slug}</small></div>
        </div>
        <nav className="vp-nav">
          {groups.map(group => <div key={group.label} style={{ display: 'contents' }}>
            <div className="vp-nav-label">{group.label}</div>
            {group.items.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className={isActive(href) ? 'active' : ''} aria-current={isActive(href) ? 'page' : undefined}><Icon size={17} />{label}</Link>)}
          </div>)}
        </nav>
        <button className="vp-signout" onClick={() => void signOut()}><LogOut size={17} />Sign out</button>
      </aside>
      <div className="vp-main">
        <header className="vp-topbar">
          <button className="btn ghost icon vp-burger" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="vp-crumbs"><span>{vendor.name}</span><span>/</span><b>{current?.label ?? 'Dashboard'}</b></div>
          <span className="vp-spacer" />
          {vendor.status === 'active' && <Link className="btn sm vp-view" href={storefrontHref(vendor)} target="_blank"><ExternalLink size={14} /><span>View storefront</span></Link>}
          <Notifications />
          <Link className="vp-user" href="/vendor/profile"><span className="vp-avatar">{user.name.slice(0, 1)}</span><span>{user.name}</span></Link>
        </header>
        <main className="vp-content">
          {vendor.status === 'pending' && <Banner tone="warn" title="Your store is awaiting approval">You can set up your profile and explore the dashboard now. Publishing products, pages and handling orders unlock as soon as the team approves your store.</Banner>}
          {vendor.status === 'rejected' && <Banner tone="bad" title="Your application was not approved">{vendor.rejection_reason || 'Please contact platform support for details.'} <Link href="/vendor/dashboard" style={{ fontWeight: 700, textDecoration: 'underline' }}>Review and resubmit</Link></Banner>}
          {vendor.status === 'suspended' && <Banner tone="bad" title="Your store is suspended">Selling tools are unavailable. Contact platform support for assistance.</Banner>}
          {vendor.status !== 'active' && vendor.status !== 'pending' && vendor.status !== 'rejected' && vendor.status !== 'suspended' && <Banner tone="info" title={`Store status: ${titleCase(vendor.status)}`} />}
          {children}
        </main>
      </div>
    </div>
  </SessionContext.Provider>;
}
