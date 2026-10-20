import { headers } from 'next/headers';
import { cache } from 'react';
import { apiFetch, ApiError, type ApiData } from '@/lib/api';
import type { Block } from '@/lib/cms';
import { SLUG, STOREFRONT_MODE, storeBase } from '@/lib/storefront';

export type SiteLink = { label: string; url: string };
export type Site = {
  name: string; logo_url: string | null; banner_url: string | null; brand_color: string | null; accent_color: string | null; description: string | null;
  navigation: SiteLink[]; footer: { text: string | null; links: SiteLink[] }; seo: { title: string | null; description: string | null };
  pages: { slug: string; kind: string; title: string; path: string }[];
};
export type SitePage = { slug: string; kind: string; title: string; seo_title: string | null; meta_description: string | null; blocks: Block[]; published_at: string | null };

const HOST = /^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$/;
export { SLUG };

/**
 * Which store this request is for, as a single string: `slug:acme` (path mode, /vendor/acme/...) or `host:acme.example.com`
 * (domain mode). Set by middleware from the real URL / Host header (never from a client header); the API still decides whether it is a real, active store.
 */
export type StoreRef = string;
export async function storeRef(): Promise<StoreRef | null> {
  const h = await headers();
  const slug = h.get('x-store-slug')?.toLowerCase() ?? '';
  if (STOREFRONT_MODE === 'path' && SLUG.test(slug)) return `slug:${slug}`;
  const host = h.get('x-store-host')?.toLowerCase() ?? '';
  return STOREFRONT_MODE === 'domain' && HOST.test(host) ? `host:${host}` : null;
}

/** The API header that identifies the store for a StoreRef. */
export function storeHeaders(ref: StoreRef): Record<string, string> {
  const [kind, value] = [ref.slice(0, ref.indexOf(':')), ref.slice(ref.indexOf(':') + 1)];
  return kind === 'slug' ? { 'X-Store-Slug': value } : { 'X-Store-Host': value };
}

/** Browser-visible prefix of this store: `/vendor/acme` in path mode, empty on a store domain. */
export function storeRoot(ref: StoreRef | null): string { return ref?.startsWith('slug:') ? storeBase(ref.slice(5)) : ''; }

/** 404 means "not an active store / page not published"; anything else is a real failure and is rethrown. */
async function lookup<T>(path: string, ref: StoreRef): Promise<T | null> {
  try { return (await apiFetch<ApiData<T>>(path, { headers: storeHeaders(ref) })).data; }
  catch (cause) { if (cause instanceof ApiError && cause.status === 404) return null; throw cause; }
}

// react cache() de-duplicates these within one request (layout, metadata and page all ask for the same data).
export const getSite = cache((ref: StoreRef) => lookup<Site>('/v1/site', ref));
export const getSitePage = cache((ref: StoreRef, slug: string) => lookup<SitePage>(`/v1/site/pages/${encodeURIComponent(slug)}`, ref));

/** Site for the current request, or null on the marketplace / unknown stores / API trouble (the marketplace layout then applies). */
export async function currentSite(): Promise<Site | null> {
  const ref = await storeRef();
  if (!ref) return null;
  try { return await getSite(ref); } catch { return null; }
}
