# Wildcard vendor storefronts on Vercel

The application uses one Next.js project for the marketplace and vendor storefronts. The Laravel API assigns a hostname in the database; it does not create a Vercel project/domain entry or DNS record.

## Configure the platform domain manually

1. Deploy the same Next.js project and open **Project → Settings → Domains** in Vercel.
2. Add the platform apex domain (for example, `yourplatform.com`) and the wildcard domain (`*.yourplatform.com`) to this project.
3. Vercel requires the nameservers method for wildcard domains. Update the registrar to the nameservers Vercel shows for this domain. If the domain already has email or other DNS records, recreate the needed records in Vercel DNS before switching nameservers.
4. Wait until Vercel verifies the apex and wildcard. Vercel provisions TLS certificates after verification. Confirm that the production deployment serves the apex and a test subdomain over HTTPS.
5. Set backend `PLATFORM_DOMAIN=yourplatform.com` and frontend `NEXT_PUBLIC_PLATFORM_DOMAIN=yourplatform.com`. Set backend `FRONTEND_URL` to the real marketplace origin and `FRONTEND_URL_PATTERN` to a narrowly scoped regular expression such as `~^https://[a-z0-9-]+\.yourplatform\.com$~` (include the apex separately in `FRONTEND_URL`). Restart/redeploy both apps after setting these environment variables.
6. Approve a vendor in `/admin/vendors/requests`. The app stores `{slug}.yourplatform.com` as `manual_pending`; it is not resolvable yet. After Vercel/DNS is confirmed, an admin uses **Mark DNS ready** to activate the Laravel mapping. That action verifies the database mapping only; it does not query DNS or Vercel.

Vercel's current wildcard requirements and certificate behavior are documented in [Adding and Configuring a Custom Domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain) and [Working with SSL Certificates](https://vercel.com/docs/domains/working-with-ssl). Use the exact records and nameservers shown in your Vercel project rather than copying a generic DNS target.

## Local wildcard testing

Set `PLATFORM_DOMAIN=localhost` in `backend/.env` and `NEXT_PUBLIC_PLATFORM_DOMAIN=localhost` in `frontend/.env.local`, then restart both servers. Use a hostname such as `approved-shop.localhost:3000`; the backend CORS config allows that local origin. Approve and activate the matching domain mapping in the admin dashboard. Browser/platform support for `*.localhost` can vary, so API host resolution tests are also available through `GET /api/v1/vendors/resolve?host=approved-shop.localhost`.

Custom domains can use the same `store_domains` mapping after a future domain ownership/verification flow is added. This implementation does not claim ownership verification for vendor-submitted custom hosts.
