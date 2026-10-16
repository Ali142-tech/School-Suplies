'use client';

import { useEffect, useState } from 'react';
import { Boxes, Building2, ClipboardCheck, CreditCard, Globe, LayoutDashboard, Receipt, Settings, Tags, Users, UserRound } from 'lucide-react';
import { apiFetch, type ApiData, type ApiPage } from '@/lib/api';
import { PortalShell, usePortalSession } from '@/components/portal/shell';
import type { SessionUser } from '@/lib/session';

/** Fired after a review decision so the sidebar count stays in step. */
export const PENDING_CHANGED = 'admin:pending-changed';
export type AdminSession = { user: SessionUser };
export const useAdminSession = () => usePortalSession<AdminSession>();

async function load(): Promise<AdminSession> {
  const { data } = await apiFetch<ApiData<SessionUser>>('/v1/auth/me');
  if (data.role !== 'platform_admin') throw new Error('not-admin');
  return { user: data };
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState(0);
  // The pending-review count is a convenience badge; if the request fails the navigation simply shows no badge.
  useEffect(() => {
    const refresh = () => { void apiFetch<ApiPage<unknown>>('/v1/admin/vendor-requests?status=pending').then(r => setPending(r.meta.total)).catch(() => undefined); };
    refresh(); window.addEventListener(PENDING_CHANGED, refresh);
    return () => window.removeEventListener(PENDING_CHANGED, refresh);
  }, []);

  return <PortalShell<AdminSession> config={{
    tag: 'ADMIN', loginHref: '/admin/login', logoutPath: '/v1/auth/logout', homeHref: '/admin/dashboard', profileHref: '/admin/profile',
    load,
    identity: s => ({ name: s.user.name, sub: 'Platform administrator' }),
    groups: [
      { label: 'Platform', items: [
        { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Applications', href: '/admin/vendors/requests', icon: ClipboardCheck, badge: pending },
        { label: 'Vendors', href: '/admin/vendors', icon: Building2 },
        { label: 'Users & schools', href: '/admin/users', icon: Users },
      ] },
      { label: 'Marketplace', items: [
        { label: 'Products', href: '/admin/products', icon: Boxes },
        { label: 'Categories', href: '/admin/categories', icon: Tags },
        { label: 'Orders', href: '/admin/orders', icon: Receipt },
      ] },
      { label: 'Operations', items: [
        { label: 'Domains', href: '/admin/domains', icon: Globe },
        { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
        { label: 'Settings', href: '/admin/settings', icon: Settings },
        { label: 'My account', href: '/admin/profile', icon: UserRound },
      ] },
    ],
  }}>{children}</PortalShell>;
}
