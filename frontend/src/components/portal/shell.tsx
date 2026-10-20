'use client';

import Link, { useStorePathname, useStoreRouter as useRouter } from '@/components/store-link';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LogOut, Menu, PackageCheck, X, type LucideIcon } from 'lucide-react';
import { apiFetch, clearAccessToken, hasAccessToken, UNAUTHORIZED_EVENT } from '@/lib/api';
import { Notifications } from '@/components/vendor-shell';
import { Spinner } from '@/components/vendor/ui';

export type NavItem = { label: string; href: string; icon: LucideIcon; badge?: number };
export type NavGroup = { label: string; items: NavItem[] };
export type Identity = { name: string; sub?: string; initial?: string; imageUrl?: string | null };

type Config<S> = {
  /** Short portal name shown next to the logo, e.g. "ADMIN". */
  tag: string;
  groups: NavGroup[] | ((session: S) => NavGroup[]);
  loginHref: string;
  /** Resolves the signed-in session, or throws when this account may not use the portal (the backend remains the authority). */
  load: () => Promise<S>;
  logoutPath: string;
  homeHref: string;
  identity: (session: S) => Identity;
  profileHref: string;
  /** Extra topbar controls (cart button, "view storefront" link…). */
  topbar?: (session: S) => ReactNode;
  /** Banners shown above every page. */
  banners?: (session: S) => ReactNode;
  brand?: (session: S) => { name: string; logoUrl?: string | null };
  notifications?: boolean;
  /** Inline CSS variables for the shell, e.g. a vendor brand colour. */
  theme?: (session: S) => React.CSSProperties | undefined;
};

const Ctx = createContext<unknown>(null);
export function usePortalSession<S>() { return useContext(Ctx) as (S & { reload: () => Promise<void> }) | null; }

export function PortalShell<S extends object>({ config, children }: { config: Config<S>; children: ReactNode }) {
  const router = useRouter();
  const path = useStorePathname();
  const [data, setData] = useState<S | null>(null);
  const [open, setOpen] = useState(false);
  const { load, loginHref, logoutPath } = config;

  const reload = useCallback(async () => { setData(await load()); }, [load]);

  // The server decides what each account can do; this only chooses between rendering the shell and sending the visitor to sign in.
  useEffect(() => {
    let active = true;
    if (!hasAccessToken()) { router.replace(loginHref); return; }
    load().then(s => { if (active) setData(s); }).catch(() => { if (!active) return; clearAccessToken(); router.replace(loginHref); });
    const expired = () => { clearAccessToken(); router.replace(loginHref); };
    window.addEventListener(UNAUTHORIZED_EVENT, expired);
    return () => { active = false; window.removeEventListener(UNAUTHORIZED_EVENT, expired); };
  }, [router, load, loginHref]);

  useEffect(() => { setOpen(false); }, [path]);
  const session = useMemo(() => data && { ...data, reload }, [data, reload]);

  async function signOut() {
    try { await apiFetch(logoutPath, { method: 'POST' }); } catch { /* the token is discarded either way */ }
    clearAccessToken();
    router.replace(loginHref);
  }

  if (!session || !data) return <div className="vp-loading" role="status"><Spinner size={26} /><span>Loading your workspace…</span></div>;

  const groups = typeof config.groups === 'function' ? config.groups(data) : config.groups;
  const flat = groups.flatMap(g => g.items);
  const isActive = (href: string) => path === href || path.startsWith(`${href}/`);
  // The most specific matching link wins, so /admin/vendors/requests does not also light up /admin/vendors.
  const best = flat.filter(i => isActive(i.href)).sort((a, b) => b.href.length - a.href.length)[0];
  const who = config.identity(data);
  const brand = config.brand?.(data);

  return <Ctx.Provider value={session}>
    <div className="vp-shell" style={config.theme?.(data)}>
      {open && <div className="vp-overlay" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className={`vp-sidebar${open ? ' open' : ''}`} aria-label={`${config.tag.toLowerCase()} navigation`}>
        <button className="btn ghost icon vp-sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={19} /></button>
        <Link href={config.homeHref} className="vp-logo"><i>{brand?.logoUrl ? <img src={brand.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} /> : <PackageCheck size={19} />}</i><span>{brand?.name ?? 'papertrail'} <small>{config.tag}</small></span></Link>
        <div className="vp-store-card">
          <span className="vp-avatar">{who.imageUrl ? <img src={who.imageUrl} alt="" /> : (who.initial ?? who.name.slice(0, 1)).toUpperCase()}</span>
          <div><b>{who.name}</b>{who.sub && <small>{who.sub}</small>}</div>
        </div>
        <nav className="vp-nav">
          {groups.map(group => <div key={group.label} style={{ display: 'contents' }}>
            <div className="vp-nav-label">{group.label}</div>
            {group.items.map(({ label, href, icon: Icon, badge }) => <Link key={href} href={href} className={best?.href === href ? 'active' : ''} aria-current={best?.href === href ? 'page' : undefined}><Icon size={17} />{label}{!!badge && <span className="count">{badge}</span>}</Link>)}
          </div>)}
        </nav>
        <button className="vp-signout" onClick={() => void signOut()}><LogOut size={17} />Sign out</button>
      </aside>
      <div className="vp-main">
        <header className="vp-topbar">
          <button className="btn ghost icon vp-burger" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="vp-crumbs"><span>{config.tag[0] + config.tag.slice(1).toLowerCase()}</span><span>/</span><b>{best?.label ?? 'Dashboard'}</b></div>
          <span className="vp-spacer" />
          {config.topbar?.(data)}
          {config.notifications !== false && <Notifications />}
          <Link className="vp-user" href={config.profileHref}><span className="vp-avatar">{(who.initial ?? who.name.slice(0, 1)).toUpperCase()}</span><span>{who.name}</span></Link>
        </header>
        <main className="vp-content">{config.banners?.(data)}{children}</main>
      </div>
    </div>
  </Ctx.Provider>;
}
