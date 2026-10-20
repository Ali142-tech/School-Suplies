'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { parseStorePath, withStorePrefix } from '@/lib/storefront';

/** The storefront slug of the page being shown (path mode only), or null on the marketplace, on a store domain and in the portals. */
export function useStoreSlug(): string | null {
  return parseStorePath(usePathname() || '/')?.slug ?? null;
}

/** The current path without the `/vendor/{slug}` prefix, so storefront-relative paths (`/about`) compare equal in both modes. */
export function useStorePathname(): string {
  const path = usePathname() || '/';
  return parseStorePath(path)?.rest ?? path;
}

/** next/link that keeps storefront-relative links inside `/vendor/{slug}` when the store is addressed by path. Identity elsewhere. */
export default function StoreLink(props: React.ComponentProps<typeof Link>) {
  const slug = useStoreSlug();
  const { href, ...rest } = props;
  return <Link {...rest} href={typeof href === 'string' ? withStorePrefix(href, slug) : href} />;
}

/** useRouter whose push/replace/prefetch stay inside the current storefront. */
export function useStoreRouter() {
  const router = useRouter();
  const slug = useStoreSlug();
  return useMemo(() => ({
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(withStorePrefix(href, slug), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(withStorePrefix(href, slug), options),
    prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(withStorePrefix(href, slug), options),
  }), [router, slug]);
}
