# Cloudflare production cutover plan

Status: prepared template only. Replace every `<owned-apex-host>` placeholder after ownership proof. Do not proxy or connect a public domain until every mandatory release gate passes for one frozen Git SHA.

## Host and DNS policy

- Canonical public host: not selected. It must be an owned and verified domain before certification.
- Set `NEXT_PUBLIC_APP_URL=https://<owned-apex-host>` in production and preview certification. `APP_URL` is the server-side equivalent.
- Only after ownership proof, make `www.<owned-apex-host>` permanently redirect to the apex host while preserving path and query.
- Preview and staging hosts remain separate Vercel hostnames and are never canonical.
- Add the apex and `www` domains to the already certified Vercel project first. Use the exact DNS target Vercel displays at setup time; do not copy a historical target from this runbook.
- Start DNS records at a 300-second TTL. After 24 hours of verified stable production traffic, raise to 3600 seconds. Lower back to 300 at least one existing TTL before planned DNS changes.
- Keep mail records unchanged. Export the complete pre-cutover DNS zone before edits.

## TLS and redirects

- Use Full (strict) SSL/TLS with a valid, hostname-matching origin certificate.
- Enable Always Use HTTPS only after the strict origin handshake succeeds.
- Enable HSTS includeSubDomains and preload only after HTTPS, apex, `www`, previews, callbacks, and recovery links have been verified. The application emits HSTS without includeSubDomains/preload during preparation.
- Implement one `www` to apex redirect at Cloudflare. Do not create a reverse or duplicate origin redirect.

## Cache safety

Create the following Cache Rules in this order.

1. **Bypass authenticated and dynamic traffic** — Cache eligibility: Bypass.

```text
(http.host in {"<owned-apex-host>" "www.<owned-apex-host>"} and (
  http.request.method ne "GET" or
  starts_with(http.request.uri.path, "/api/") or
  starts_with(http.request.uri.path, "/dashboard") or
  starts_with(http.request.uri.path, "/business") or
  starts_with(http.request.uri.path, "/admin") or
  starts_with(http.request.uri.path, "/control") or
  starts_with(http.request.uri.path, "/auth/") or
  starts_with(http.request.uri.path, "/login") or
  starts_with(http.request.uri.path, "/reset-password") or
  starts_with(http.request.uri.path, "/onboarding") or
  http.cookie ne "" or
  any(http.request.headers.names[*] eq "authorization")
))
```

2. **Respect origin controls for public content** — Eligible only for `GET` and `HEAD` requests not matched above. Respect origin `Cache-Control`; if absent, bypass. Never use Cache Everything across HTML application routes.

3. **Immutable framework assets** — Permit caching only for `/_next/static/` and explicitly immutable public assets, while respecting the versioned URL. Do not cache service-worker responses beyond their origin revalidation policy.

Validation must show `CF-Cache-Status: DYNAMIC` or equivalent ineligible behavior for authenticated pages and APIs. Test two isolated accounts and confirm neither receives the other's content. Varying on Cookie is not a substitute for bypassing private HTML.

## Security controls

- Enable the Cloudflare Managed Ruleset and OWASP ruleset in log/simulate mode first; review false positives, then move approved rules to block.
- Enable bot protection appropriate to the subscribed plan. Never challenge verified email callbacks, password recovery callbacks, or authenticated API traffic without a tested exception.
- Initial rate limits, subject to measurement:
  - `POST /api/security/password-check`: 10 requests/minute/IP, managed challenge then block.
  - state-changing `/api/ai-insights*`: 30 requests/minute/account at the application plus 60 requests/minute/IP at the edge.
  - `POST /api/business/team/invite`: 10 requests/5 minutes/account and 30 requests/5 minutes/IP.
  - login page traffic: start in log mode and derive a threshold from normal traffic before enforcement; Supabase Auth remains the authoritative credential-attempt limiter.
- Keep Browser Integrity Check enabled unless a measured client-compatibility issue requires a reviewed exception.
- Configure malicious-upload detection if available, but keep server-side signature, decode, and malware controls authoritative.

## Origin restriction

Before public cutover, configure an edge transform rule that overwrites a dedicated origin-verification header with a high-entropy secret, configure the same secret only in the production Vercel environment, and make the application reject production-host requests missing the exact value. Remove any client-supplied instance of the header before setting it. Preview hosts must use a separate bypass explicitly limited to Vercel preview hostnames. Rotate the secret by accepting old and new values briefly, updating Cloudflare first, then removing the old value.

This control is not active until both sides and the direct-origin denial test are complete.

## WebSockets and APIs

- Do not cache upgrade requests.
- Verify Supabase Realtime connections through the final host and CSP.
- Preserve `Authorization`, `Cookie`, `Origin`, `Sec-Fetch-Site`, and correlation headers to the origin.
- Confirm API errors preserve their 4xx/5xx status and are never converted into cached 200 responses.

## Staged activation

1. Export DNS and Cloudflare settings.
2. Add and verify domains at Vercel without changing public DNS.
3. Deploy the frozen SHA and run exact-head, authenticated, browser, accessibility, email, and recovery gates.
4. Create Cloudflare rules as drafts or log-only controls.
5. Set 300-second TTL and update DNS.
6. Verify strict TLS, redirects, headers, callbacks, WebSockets, private-cache bypass, WAF events, and rate limits.
7. Enable blocking controls incrementally.
8. Raise TTL only after 24 hours of clean evidence.

## Rollback

- Disable Cloudflare proxying or restore the exported DNS records with the 300-second TTL.
- Roll Vercel back to the last known-good immutable deployment.
- Disable newly enforced WAF/rate-limit rules individually; do not disable TLS validation.
- Restore the previous origin-secret value on both sides if a rotation caused denial.
- Purge only public static caches. Private routes should never have entered cache.
- Record operator, timestamp, reason, affected rule IDs, and recovery confirmation.

Cloudflare documentation references:

- [Full (strict) TLS](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)
- [Always Use HTTPS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/)
- [Cache Rule settings](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/)
- [Bypass cache on cookie](https://developers.cloudflare.com/cache/how-to/cache-rules/examples/bypass-cache-on-cookie/)
- [WAF rate-limiting practices](https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/)
