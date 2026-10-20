import { NextRequest, NextResponse } from 'next/server';
import { STOREFRONT_MODE, parseStorePath } from '@/lib/storefront';

const reserved = new Set(['www', 'admin', 'api', 'app', 'mail', 'cdn', 'support', 'ftp', 'status']);

export function middleware(request: NextRequest) {
  // x-store-host / x-store-slug are internal signals derived below from the real request. A value sent by the client is never trusted.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-store-host');
  requestHeaders.delete('x-store-slug');
  const pass = () => NextResponse.next({ request: { headers: requestHeaders } });
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) return pass();

  if (STOREFRONT_MODE === 'path') return pathMode(request, requestHeaders, pass);
  return domainMode(request, requestHeaders, pass);
}

// Path mode: /vendor/{slug}[/...] is the storefront of {slug}. It is served by the same tenant-aware routes the domain mode uses
// (/ -> tenant-store, /products, /cart, /school/..., CMS pages), with the slug handed over as an internal header.
function pathMode(request: NextRequest, requestHeaders: Headers, pass: () => NextResponse) {
  const { pathname } = request.nextUrl;
  const store = parseStorePath(pathname);
  if (store) {
    requestHeaders.set('x-store-slug', store.slug);
    const target = request.nextUrl.clone();
    target.pathname = store.rest === '/' ? '/tenant-store' : store.rest;
    return NextResponse.rewrite(target, { request: { headers: requestHeaders } });
  }
  // The pre-path-mode marketplace profile URL (/store/{slug}) now lives at /vendor/{slug}.
  const legacy = pathname.match(/^\/stores?\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/);
  if (legacy) {
    const target = request.nextUrl.clone();
    target.pathname = `/vendor/${legacy[1]}`;
    return NextResponse.redirect(target);
  }
  return pass();
}

// Domain mode: the vendor is identified by the hostname the visitor used (a platform subdomain or a verified custom domain).
function domainMode(request: NextRequest, requestHeaders: Headers, pass: () => NextResponse) {
  const hostname = (request.headers.get('host') || '').split(':')[0].toLowerCase().replace(/\.$/, '');
  const platformDomain = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || '').toLowerCase().replace(/^\.+|\.+$/g, '');
  if (!hostname || ['localhost', '127.0.0.1', '::1'].includes(hostname)) return pass();

  if (platformDomain && (hostname === platformDomain || hostname === `www.${platformDomain}` || hostname === `admin.${platformDomain}` || hostname === `api.${platformDomain}` || hostname === `app.${platformDomain}`)) return pass();
  const subdomain = platformDomain && hostname.endsWith(`.${platformDomain}`) ? hostname.slice(0, -(platformDomain.length + 1)) : hostname.split('.')[0];
  if (!subdomain || reserved.has(subdomain) || subdomain.includes('.')) return pass();

  // Vendor host candidate: every route can now see which hostname to resolve (Laravel decides whether it is a verified, active domain).
  requestHeaders.set('x-store-host', hostname);
  if (request.nextUrl.pathname !== '/') return pass();
  return NextResponse.rewrite(new URL('/tenant-store', request.url), { request: { headers: requestHeaders } });
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
