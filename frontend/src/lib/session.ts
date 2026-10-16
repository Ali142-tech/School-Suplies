export type SessionVendor = { id: number; name: string; slug: string; status: string };
export type SessionUser = {
  id: number; name: string; email: string; phone?: string | null; role: string;
  vendor_memberships?: { role: string; vendor: SessionVendor }[];
};

export type Portal = 'admin' | 'vendor' | 'customer';

/** Which workspace an authenticated account belongs in. The backend enforces access; this only picks where to send the person. */
export function portalFor(user: Pick<SessionUser, 'role' | 'vendor_memberships'>): Portal {
  if (user.role === 'platform_admin') return 'admin';
  if (user.vendor_memberships?.some(m => m.vendor)) return 'vendor';
  return 'customer';
}

export const PORTAL_HOME: Record<Portal, string> = { admin: '/admin/dashboard', vendor: '/vendor/dashboard', customer: '/' };
export const PORTAL_LOGIN: Record<Portal, string> = { admin: '/admin/login', vendor: '/vendor/login', customer: '/login' };
