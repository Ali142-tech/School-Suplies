# Papertrail Supply Co. — frontend prototype

Responsive Next.js App Router marketplace prototype for school supplies and printing.

## Run locally

```bash
npm install
npm run dev
```

The local integration expects Laravel at `http://127.0.0.1:8001`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8001/api
NEXT_PUBLIC_PLATFORM_DOMAIN=localhost
```

The frontend calls versioned routes under `/v1`. Set `NEXT_PUBLIC_USE_MOCK_DATA=true` only when developing without an available backend; otherwise API failures are shown in the page. Catalog, categories, storefronts, accounts, orders, vendor tools, admin tools, and printing quote requests use the Laravel API. Authentication uses Sanctum bearer tokens stored in tab-scoped `sessionStorage` and sent in the `Authorization` header. The cart remains local until checkout submits product IDs and quantities; Laravel calculates authoritative prices and creates an unpaid order. No payment is collected.

## Vercel

Import the frontend folder as a Next.js project in Vercel, set `NEXT_PUBLIC_API_URL` to the deployed API base URL when the backend is ready, then deploy. No secrets belong in `NEXT_PUBLIC_*` variables.

## Local access and development users

Open the app at `http://localhost:3000`. Customer routes are `/login`, `/register`, `/forgot-password`, `/account`, `/account/orders`; school routes on the assigned vendor hostname are `/school/register`, `/school/login`, and `/school/dashboard`; vendor routes are `/vendor/register`, `/vendor/login`, `/vendor/dashboard`, `/vendor/products`, `/vendor/schools`, `/vendor/orders`, `/vendor/store-settings`, and `/vendor/profile`; admin routes are `/admin/login`, `/admin/dashboard`, `/admin/vendors/requests`, `/admin/vendors`, `/admin/customers`, `/admin/products`, `/admin/orders`, and `/admin/settings`.

For local school testing, use the vendor hostname assigned in Laravel, such as `http://school-shop.localhost:3000/school/register`. The shared API client sends this browser hostname as `X-Store-Host`; Laravel accepts it only when the hostname is a verified active domain for an active vendor. School and order APIs require a school bearer token tied to that same vendor.

Vendor applications are reviewed at `/admin/vendors/requests`. Approval assigns a database hostname but does not configure DNS. See [`docs/vercel-multitenant-domains.md`](../docs/vercel-multitenant-domains.md) before enabling wildcard storefronts. Local wildcard requests use `*.localhost:3000` and require matching Laravel CORS configuration.

The development seeder creates `seller@example.test`, `customer@example.test`, `pending-shop@example.test`, and `suspended-shop@example.test`, all with the development-only password `ChangeThisDemoPassword123!`. Provision an admin in the backend folder with `php artisan admin:provision`; the command prompts for an email and hidden password. Password reset emails use Laravel's configured local mail log. Change or remove sample users before sharing a development environment.

Vendor approval, membership, and product/order ownership are enforced by Laravel middleware and scoped queries; frontend route guards are only for navigation. A pending or suspended vendor can sign in and view the account status, but cannot publish products, update orders, or change store operations. The tab-scoped token is accessible to same-origin JavaScript, so protect the app from XSS and sign out on shared devices. No payment processing is implemented.

## Portals and shared design system

Every role has its own layout, navigation and sign-in. All three portals share one design system (`src/app/vendor/vendor.css` as the base, `src/app/portal.css` for per-portal accents and extras, and `src/components/portal/*` for the shell, tables, filters, drawers and modals).

| Portal | Routes | Layout / guard | Accent |
| --- | --- | --- | --- |
| Super Admin | `/admin/login`, `/admin/dashboard`, `/admin/vendors/requests`, `/admin/vendors`, `/admin/users`, `/admin/products`, `/admin/categories`, `/admin/orders`, `/admin/domains`, `/admin/subscriptions`, `/admin/settings`, `/admin/profile` | `src/components/admin/shell.tsx` (requires `role = platform_admin`) | indigo |
| Vendor | `/vendor/*` | `src/components/vendor-shell.tsx` (requires a vendor membership) | teal |
| School | `/school/login`, `/school/register`, `/school/dashboard`, `/school/catalog`, `/school/cart`, `/school/orders`, `/school/orders/[id]`, `/school/profile` | `src/components/school/shell.tsx` (requires an active school account of the visiting vendor) | blue, or the vendor's own brand colour |

`/login` is the general front door: after sign-in, `portalFor()` in `src/lib/session.ts` sends admins to `/admin/dashboard`, vendor members to `/vendor/dashboard` and customers to the storefront. School accounts are tied to one vendor, so they sign in on that vendor's own address (the API rejects school credentials at `/v1/auth/login`).

Frontend guards only decide which screen to show. Laravel enforces every permission and all data isolation; a rejected token (401) from any call sends the person back to that portal's sign-in.

> Local development: `.env.local` may point `NEXT_PUBLIC_API_URL` at a deployed environment. Override it in your shell (for example `NEXT_PUBLIC_API_URL=http://127.0.0.1:8001/api npm run dev`) so testing never talks to a hosted API.
