'use client';

import Link from '@/components/store-link';
import { Home, LayoutDashboard, Package, Receipt, School as SchoolIcon, ShoppingCart } from 'lucide-react';
import { apiFetch, type ApiData } from '@/lib/api';
import { PortalShell, usePortalSession } from '@/components/portal/shell';
import { Banner } from '@/components/portal/ui';
import { SchoolCartProvider, useSchoolCart } from './cart';

export type SchoolProfile = { id: number; name: string; phone: string | null; address: string | null; user: { name: string; email: string; phone: string | null } };
export type StoreBrand = { name: string; logo_url: string | null; brand_color: string | null };
export type SchoolSession = { school: SchoolProfile; store: StoreBrand | null };
export const useSchoolSession = () => usePortalSession<SchoolSession>();

async function load(): Promise<SchoolSession> {
  // /school/me is authoritative: Laravel rejects anyone who is not an active school account of this store.
  const { data: school } = await apiFetch<ApiData<SchoolProfile>>('/v1/school/me');
  // Branding is cosmetic; a failure here must not lock the school out.
  const store = await apiFetch<ApiData<StoreBrand>>('/v1/site').then(r => r.data).catch(() => null);
  return { school, store };
}

function CartButton() {
  const { count } = useSchoolCart();
  return <Link className="btn ghost icon vp-cart-btn" href="/school/cart" aria-label={`Order basket, ${count} item${count === 1 ? '' : 's'}`}><ShoppingCart size={19} />{count > 0 && <b>{count}</b>}</Link>;
}

const HEX = /^#[0-9a-f]{6}$/i;

function Shell({ children }: { children: React.ReactNode }) {
  return <PortalShell<SchoolSession> config={{
    tag: 'SCHOOL', loginHref: '/school/login', logoutPath: '/v1/school/logout', homeHref: '/school/dashboard', profileHref: '/school/profile',
    load,
    brand: s => ({ name: s.store?.name ?? 'papertrail', logoUrl: s.store?.logo_url }),
    identity: s => ({ name: s.school.name, sub: s.school.user.email }),
    theme: s => (s.store?.brand_color && HEX.test(s.store.brand_color) ? { ['--vp-brand' as string]: s.store.brand_color, ['--vp-brand-600' as string]: `color-mix(in srgb, ${s.store.brand_color} 82%, black)`, ['--vp-brand-50' as string]: `color-mix(in srgb, ${s.store.brand_color} 10%, white)`, ['--vp-brand-100' as string]: `color-mix(in srgb, ${s.store.brand_color} 22%, white)` } : undefined),
    groups: [
      { label: 'Ordering', items: [
        { label: 'Dashboard', href: '/school/dashboard', icon: LayoutDashboard },
        { label: 'Browse catalog', href: '/school/catalog', icon: Package },
        { label: 'Order basket', href: '/school/cart', icon: ShoppingCart },
        { label: 'My orders', href: '/school/orders', icon: Receipt },
      ] },
      { label: 'Account', items: [{ label: 'School profile', href: '/school/profile', icon: SchoolIcon }] },
    ],
    topbar: () => <CartButton />,
    banners: s => !s.school.address ? <Banner tone="warn" title="Add your delivery address" action={<Link className="btn sm" href="/school/profile"><Home size={14} />Open profile</Link>}>Orders need a delivery address. Add it to your school profile before checking out.</Banner> : null,
  }}>{children}</PortalShell>;
}

export function SchoolShell({ children }: { children: React.ReactNode }) {
  return <SchoolCartProvider><Shell>{children}</Shell></SchoolCartProvider>;
}
