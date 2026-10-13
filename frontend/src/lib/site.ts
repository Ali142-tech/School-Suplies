import { headers } from 'next/headers';
import { cache } from 'react';
import { apiFetch, ApiError, type ApiData } from '@/lib/api';
import type { Block } from '@/lib/cms';

export type SiteLink = { label: string; url: string };
export type Site = {
  name: string; logo_url: string | null; banner_url: string | null; brand_color: string | null; accent_color: string | null; description: string | null;
  navigation: SiteLink[]; footer: { text: string | null; links: SiteLink[] }; seo: { title: string | null; description: string | null };
  pages: { slug: string; kind: string; title: string; path: string }[];
};
export type SitePage = { slug: string; kind: string; title: string; seo_title: string | null; meta_description: string | null; blocks: Block[]; published_at: string | null };

const HOST = /^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$/;
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The vendor hostname for this request, as set by middleware from the real Host header (never from a client header). */
export function vendorHost(): string | null {
  const host = headers().get('x-store-host')?.toLowerCase() ?? '';
  return HOST.test(host) ? host : null;
}

/** 404 means "not an active vendor domain / page not published"; anything else is a real failure and is rethrown. */
async function lookup<T>(path: string, host: string): Promise<T | null> {
  try { return (await apiFetch<ApiData<T>>(path, { headers: { 'X-Store-Host': host } })).data; }
  catch (cause) { if (cause instanceof ApiError && cause.status === 404) return null; throw cause; }
}

// react cache() de-duplicates these within one request (layout, metadata and page all ask for the same data).
export const getSite = cache((host: string) => lookup<Site>('/v1/site', host));
export const getSitePage = cache((host: string, slug: string) => lookup<SitePage>(`/v1/site/pages/${encodeURIComponent(slug)}`, host));

/** Site for the current request, or null on the marketplace / unknown hosts / API trouble (the marketplace layout then applies). */
export async function currentSite(): Promise<Site | null> {
  const host = vendorHost();
  if (!host) return null;
  try { return await getSite(host); } catch { return null; }
}
