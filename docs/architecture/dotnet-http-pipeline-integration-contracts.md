# .NET Business Core HTTP Pipeline Integration Contracts

## Purpose

This additive node verifies the real ASP.NET Core HTTP pipeline without deploying the API, applying a database migration, or using live Supabase credentials.

The production API composition is extracted into one reusable bootstrap. Both the executable entry point and the integration contracts call the same service registration, middleware, authentication, authorization, endpoint, health, timeout, correlation, and security-header configuration.

## Verified HTTP outcomes

The integration host binds an ephemeral loopback Kestrel port and verifies:

- missing bearer credential returns `401` with a Bearer challenge
- malformed or API-key bearer credential returns `401` before remote verification
- unavailable identity verification returns `503` with bounded retry guidance
- invalid route tenant returns `400` with `tenant_unavailable`
- verified subject without exact active membership returns `403`
- unavailable membership projection returns `503`
- verified subject with exact active membership returns `200`
- client tenant headers are ignored in favor of the route tenant
- viewer membership receives conservative exact permissions
- correlation IDs and baseline security headers are preserved
- the public security contract continues to report no active writes and no service-role usage

## Important correction

The previous route template used a GUID route constraint. That caused malformed tenant values to be rejected by routing as `404` before the business context resolver could return the documented `400 tenant_unavailable` response.

The route selector is now unconstrained and the server-side tenant parser remains authoritative. Valid tenant behavior is unchanged.

## Test boundary

- the full ASP.NET Core pipeline runs over real loopback HTTP
- the Supabase identity verifier and membership projection reader are deterministic in-memory test doubles
- no live Supabase project is contacted
- no production token, publishable key, secret key, or service-role key is used
- no write endpoint is activated
- no database schema or RLS policy is changed

## Preservation rule

`Preserve -> Extend -> Verify -> Migrate gradually -> Remove only after explicit approval`
