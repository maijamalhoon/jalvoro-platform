# .NET staging Supabase smoke harness

## Purpose

This node adds a protected, read-only live verification path for the JALVORO Business Core without routing production traffic or applying database changes.

The harness validates the same Supabase identity and tenant-context path used by the production ASP.NET Core composition:

1. validate the target and injected configuration before making a network call;
2. verify the staging test JWT through Supabase Auth `/auth/v1/user`;
3. verify that the required `public.business_members` Data API contract is available;
4. start the exact Business Core ASP.NET Core application on an ephemeral loopback port;
5. resolve the configured tenant through `GET /api/v1/context/{tenantId}`;
6. require a `200` read-only context for the expected subject and tenant.

Only HTTP `GET` requests are issued.

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
  - legacy anon JWT keys are rejected by this new harness.
- `JALVORO_SUPABASE_STAGING_TEST_JWT`
  - must belong to a dedicated non-production test user;
  - must not be copied from a production session.

Environment variables:

- `JALVORO_SUPABASE_STAGING_TEST_USER_ID`
  - exact UUID expected from the Auth server response.
- `JALVORO_SUPABASE_STAGING_TENANT_ID`
  - exact staging tenant UUID expected to have an active membership for the test user.

The workflow injects these values at runtime. No credential, user JWT, API key, test-user UUID, or tenant UUID is committed to the repository.

## Manual execution

Workflow:

`.github/workflows/dotnet-staging-supabase-smoke.yml`

It runs only through `workflow_dispatch` and requires the exact confirmation:

`STAGING_ONLY_READ_ONLY`

The job uses the GitHub `staging` environment so approvals and environment-level secret controls can be applied independently from production.

## Failure codes

The executable fails closed and reports only sanitized status codes:

- `configuration_rejected`: missing or unsafe runtime injection;
- `identity_check_failed`: invalid or unavailable staging identity verification;
- `schema_probe_failed:notready`: required staging schema is missing or not exposed;
- `schema_probe_failed:accessdenied`: authenticated Data API access is not configured correctly;
- `exact_active_membership_not_found`: the test user lacks the configured active tenant membership;
- `api_dependency_unavailable`: Supabase was unavailable during the full API path;
- `resolved_context_contract_failed`: the live response violated the Business Core contract.

Keys, JWTs, subject IDs, tenant IDs, and response bodies are never written to logs.

## Current live staging readiness

A read-only metadata inspection on July 24, 2026 found:

- staging project status: healthy;
- `public.business_members`: absent;
- RLS policy `business_members_select_self`: consequently absent;
- migration `20260721173000_create_business_workspace_foundation`: not recorded in the staging migration history;
- follow-up membership hardening migrations `20260721174500` and `20260722070300`: not recorded.

Therefore the full live tenant-context smoke is expected to stop at `schema_not_ready` until an explicit staging migration-sync decision is made.

This node does not apply those migrations. It prevents the missing schema from being reported as a false success.

## Preservation boundary

This node does not:

- access or call the production Supabase project;
- create a Supabase branch or project;
- apply a migration or execute DDL;
- create, update, or delete database rows;
- create an Auth user or session;
- commit credentials;
- expose a service-role or secret key;
- activate a business write endpoint;
- deploy the .NET API;
- route production traffic;
- modify Personal Tracking.

## Architecture rule

`Preserve -> Extend -> Verify -> Migrate gradually -> Remove only after explicit approval`
