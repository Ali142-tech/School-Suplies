// Storefront addressing, shared by middleware, server components and the browser. Tenant identity is always the vendor (slug or a
// verified domain, resolved by the API); this file only knows how a storefront URL is *shaped*.
//
//  path   (default)  https://<app host>/vendor/{slug}[/...]     needs no DNS
//  domain            https://{slug}.<platform domain>/ or a verified custom domain; the Host header identifies the store

export type StorefrontMode = 'path' | 'domain';
export const STOREFRONT_MODE: StorefrontMode = process.env.NEXT_PUBLIC_STOREFRONT_MODE === 'domain' ? 'domain' : 'path';

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Path prefix of storefronts in path mode. */
export const STORE_PREFIX = 'vendor';

// /vendor/<segment> belongs to the vendor portal for these names, so they can never be storefront slugs (the API reserves the same list).
const PORTAL_SEGMENTS = new Set([
  'login', 'register', 'forgot-password', 'dashboard', 'categories', 'orders', 'pages', 'printing', 'products', 'profile', 'schools', 'store-settings', 'team', 'website',
  'www', 'admin', 'api', 'app', 'mail', 'cdn', 'support', 'ftp', 'localhost', 'root', 'status',
]);
// First path segments that always belong to the application itself, never to a storefront.
const APP_ROOTS = new Set([STORE_PREFIX, 'admin', 'api', '_next']);

export type StorePath = { slug: string; rest: string };

/** `/vendor/acme/products?x=1` → { slug: 'acme', rest: '/products' }; null for anything that is not a path-mode storefront. */
export function parseStorePath(pathname: string): StorePath | null {
  if (STOREFRONT_MODE !== 'path') return null;
  const match = pathname.match(new RegExp(`^/${STORE_PREFIX}/([^/]+)(/.*)?$`));
  if (!match) return null;
  const slug = match[1].toLowerCase();
  if (slug.length > 63 || !SLUG.test(slug) || PORTAL_SEGMENTS.has(slug)) return null;
  const rest = match[2] && match[2] !== '/' ? match[2].replace(/\/+$/, '') : '/';
  if (APP_ROOTS.has(rest.slice(1).split('/')[0])) return null;   // /vendor/acme/admin/... is not a storefront page
  return { slug, rest };
}

export function storeBase(slug: string): string { return `/${STORE_PREFIX}/${slug}`; }

/** Keeps an in-app link inside the storefront it is rendered on. Links to the portals, the API and external targets are untouched. */
export function withStorePrefix(href: string, slug: string | null): string {
  if (!slug || !href.startsWith('/') || href.startsWith('//')) return href;
  const first = href.slice(1).split(/[/?#]/)[0];
  if (APP_ROOTS.has(first)) return href;
  return storeBase(slug) + (href === '/' ? '' : href);
}

/**
 * Public address of a store for listings ("Visit store"). Path mode: /vendor/{slug}. Domain mode: the absolute URL the API publishes
 * for the vendor (its verified domain), or the marketplace profile page while it has none.
 */
export function storefrontHref(vendor: { slug: string; storefront_url?: string | null }): string {
  if (STOREFRONT_MODE === 'path') return storeBase(vendor.slug);
  return vendor.storefront_url || `/store/${vendor.slug}`;
}
