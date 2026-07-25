# GitHub OIDC staging smoke session boundary

## Purpose

The protected JALVORO staging smoke workflow exchanges a short-lived GitHub Actions OIDC token for a short-lived Supabase user session. GitHub does not store the staging user's email, password, JWT, user ID, tenant ID, publishable key, or refresh token.

## Trust boundary

The staging-only Edge Function `jalvoro-github-staging-smoke-session` verifies all of the following before accessing Vault:

- GitHub OIDC issuer: `https://token.actions.githubusercontent.com`
- audience: `jalvoro-staging-smoke`
- repository: `maijamalhoon/jalvoro-platform`
- customized protected-environment subject: `repo:maijamalhoon@150429791/jalvoro-platform@1269849875:environment:staging`
- workflow path: `.github/workflows/dotnet-staging-supabase-smoke.yml`
- branch: `agent/staging-business-smoke-readiness`
- event: `workflow_dispatch`
- approved actor
- bounded token expiry
- unique one-time `jti`

The broker stores only the OIDC replay identifier and non-secret workflow metadata in the private schema. The table is not exposed to `PUBLIC`, `anon`, `authenticated`, or `service_role`.

During initial proof validation, sanitized claim outcomes were written to `private.github_oidc_staging_smoke_diagnostics`. It stores claim values and the rejection reason only; it never stores the encoded JWT, signature, access token, password, Vault secret, or refresh token. All exposed-role privileges are revoked.

## Credential flow

1. GitHub Actions requests an OIDC token with the exact staging audience.
2. The staging broker verifies the signature through GitHub's OIDC JWKS and checks every bound claim.
3. The broker reads the dedicated staging email/password from Supabase Vault over the server-side database connection.
4. Supabase Auth issues a fresh one-hour user access token.
5. The workflow masks the OIDC token, user access token, subject ID, and tenant ID.
6. The existing .NET Kestrel smoke harness verifies Auth, schema availability, membership, tenant resolution, permissions, and the read-only response contract.

No service-role key is returned to GitHub, and no production project is called.

## Live proof

GitHub Actions run `30146141995` completed successfully on July 25, 2026. The run passed:

- explicit staging-only execution guard
- GitHub OIDC token acquisition
- OIDC-to-Vault staging session exchange
- repository checkout
- .NET 10 setup
- staging harness restore
- warnings-as-errors build
- exact read-only Auth and tenant-context smoke

The temporary branch `push` trigger was removed after the proof. The workflow is now manual-only through `workflow_dispatch`, and the broker accepts only that event.

## Preservation

`Preserve -> Extend -> Verify -> Migrate gradually -> Remove only after explicit approval`
