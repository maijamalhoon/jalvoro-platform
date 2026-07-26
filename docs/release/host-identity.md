# Canonical host ownership gate

Status: blocked.

A live domain-control check on 2026-07-26 reported `jalvoro.com` as available for registration. Availability is not proof of ownership, so the candidate no longer treats that hostname or its email domain as production identity. No domain was purchased or connected.

The code resolves the canonical origin in this order:

1. `NEXT_PUBLIC_APP_URL`;
2. server-only `APP_URL`;
3. Vercel's environment-provided `VERCEL_PROJECT_PRODUCTION_URL`;
4. `http://localhost:3000` for non-Vercel local work.

It never uses a preview deployment URL as the permanent fallback. Production certification requires an owned domain, Vercel verification, an exact canonical environment variable, working support email under a verified sender domain, and regenerated robots/sitemap/Open Graph/manifest smoke evidence.

The package is private and points its homepage to the repository rather than an unowned marketing host. The default support address is the deliberately non-deliverable `support@example.invalid`; this prevents an unowned real-domain claim and is itself a production gate failure until configured.
