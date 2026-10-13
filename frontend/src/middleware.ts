import { NextRequest, NextResponse } from 'next/server';

const reserved = new Set(['www', 'admin', 'api', 'app', 'mail', 'cdn', 'support', 'ftp', 'status']);

export function middleware(request: NextRequest) {
  // x-store-host is an internal signal derived below from the real Host header. A value sent by the client is never trusted.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-store-host');
  const pass = () => NextResponse.next({ request: { headers: requestHeaders } });

  const hostname = (request.headers.get('host') || '').split(':')[0].toLowerCase().replace(/\.$/, '');
  const platformDomain = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || '').toLowerCase().replace(/^\.+|\.+$/g, '');
  if (!hostname || ['localhost', '127.0.0.1', '::1'].includes(hostname)) return pass();
  if (request.nextUrl.pathname.startsWith('/_next') || request.nextUrl.pathname.startsWith('/api')) return pass();

  if (platformDomain && (hostname === platformDomain || hostname === `www.${platformDomain}` || hostname === `admin.${platformDomain}` || hostname === `api.${platformDomain}` || hostname === `app.${platformDomain}`)) return pass();
  const subdomain = platformDomain && hostname.endsWith(`.${platformDomain}`) ? hostname.slice(0, -(platformDomain.length + 1)) : hostname.split('.')[0];
  if (!subdomain || reserved.has(subdomain) || subdomain.includes('.')) return pass();

  // Vendor host candidate: every route can now see which hostname to resolve (Laravel decides whether it is a verified, active domain).
  requestHeaders.set('x-store-host', hostname);
  if (request.nextUrl.pathname !== '/') return pass();
  return NextResponse.rewrite(new URL('/tenant-store', request.url), { request: { headers: requestHeaders } });
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
