# .NET staging Supabase smoke harness

## Purpose

This node provides a protected, read-only live verification path for the JALVORO Business Core without routing production traffic.

The harness validates the same Supabase identity and tenant-context path used by the production ASP.NET Core composition:

1. validate the target and injected configuration before making a network call;
2. obtain a fresh short-lived session for the dedicated staging identity;
3. verify that JWT through Supabase Auth `/auth/v1/user`;
4. verify that the required `public.business_members` Data API contract is available;
5. start the exact Business Core ASP.NET Core application on an ephemeral loopback port;
6. resolve the configured tenant through `GET /api/v1/context/{tenantId}`;
7. require a `200` read-only context for the expected subject and tenant.

The .NET smoke process issues only HTTP `GET` requests. The workflow's one authentication request is a Supabase Auth session exchange; it does not mutate business data.

## Protected target

Allowed staging project:

- name: `jamals-finance-load-test-staging`
- project ref: `zqhdwjivyfzeoqvahjme`
- URL: `https://zqhdwjivyfzeoqvahjme.supabase.co`

Hard-blocked production project:

- name: `jalvoro-production`
- project ref: `tdagzmgcgjlyqzegmizg`

The executable rejects every Supabase hostname except the approved staging hostname. Passing `staging` through an environment variable cannot redirect the smoke test to production.

## Required GitHub environment configuration

Create or use the protected GitHub environment named `staging`.

Encrypted environment secrets:

- `JALVORO_SUPABASE_STAGING_PUBLISHABLE_KEY`
  - must use the modern `sb_publishable_...` format;
  - secret and service-role keys are rejected;
  - legacy anon JWT keys are rejected by this harness.
- `JALVORO_SUPABASE_STAGING_TEST_EMAIL`
  - dedicated non-production identity only.
- `JALVORO_SUPABASE_STAGING_TEST_PASSWORD`
  - dedicated non-production identity only;
  - never printed or passed as a command-line argument.

Environment variables:

- `JALVORO_SUPABASE_STAGING_TEST_USER_ID`
  - exact UUID expected from the fresh Auth session.
- `JALVORO_SUPABASE_STAGING_TENANT_ID`
  - exact staging tenant UUID expected to have an active membership for the test user.

The workflow signs in at runtime, rejects a subject mismatch, masks the short-lived access token, and passes that token only through `GITHUB_ENV` to the smoke process. A static expiring JWT is not stored as a GitHub secret.

No credential, access token, API key, test-user UUID, or tenant UUID is committed to the repository.

## Manual execution

Workflow:

`.github/workflows/dotnet-staging-supabase-smoke.yml`

It runs only through `workflow_dispatch` and requires the exact confirmation:

`STAGING_ONLY_READ_ONLY`

The job uses the GitHub `staging` environment so approvals and environment-level secret controls remain independent from production.

## Failure codes

The executable fails closed and reports only sanitized status codes:

- `configuration_rejected`: missing or unsafe runtime injection;
- `identity_check_failed`: invalid or unavailable staging identity verification;
- `schema_probe_failed:notready`: required staging schema is missing or not exposed;
- `schema_probe_failed:accessdenied`: authenticated Data API access is not configured correctly;
- `exact_active_membership_not_found`: the test user lacks the configured active tenant membership;
- `api_dependency_unavailable`: Supabase was unavailable during the full API path;
- `resolved_context_contract_failed`: the live response violated the Business Core contract.

Keys, passwords, JWTs, subject IDs, tenant IDs, and response bodies are never written to logs.

## Current live staging readiness

The staging synchronization and identity preparation completed on July 25, 2026.

Prepared state:

- staging project status: healthy;
- `public.businesses`: present with RLS;
- `public.business_members`: present with RLS;
- `business_members_select_self`: present;
- authenticated Data API self-read: enabled;
- anonymous membership read: denied;
- dedicated non-anonymous Auth identity: prepared;
- dedicated services tenant: prepared;
- active owner membership: prepared;
- PK / PKR / Asia-Karachi workspace context: prepared;
- durable identity credentials: stored in Supabase Vault;
- one-time bootstrap credentials and access token: wiped;
- provisioning Edge Function: retired and JWT-protected.

Live staging evidence:

- Auth user verification: `200`, exact subject, `authenticated`, non-anonymous;
- exact membership projection: `200`, one active owner row;
- cross-tenant projection: `200`, zero rows;
- anonymous membership projection: `401`.

The repository workflow still requires authorized synchronization of the protected GitHub `staging` environment values. That operation must not expose the Vault values in source control or logs.

## Preservation boundary

This node does not:

- access or call the production Supabase project;
- create a production Supabase branch or project;
- apply a production migration;
- activate a .NET business write endpoint;
- commit credentials;
- expose a service-role or secret key;
- deploy the .NET API;
- route production traffic;
- modify Personal Tracking;
- delete an existing product file or migration.

## Architecture rule

`Preserve -> Extend -> Verify -> Migrate gradually -> Remove only after explicit approval`
