# JALVORO staging business-smoke readiness

## Scope

This record covers the isolated Supabase project used for non-production load and integration verification:

- project name: `jamals-finance-load-test-staging`
- project ref: `zqhdwjivyfzeoqvahjme`
- region: `ap-southeast-1`
- production project ref `tdagzmgcgjlyqzegmizg` remained blocked and untouched

The work prepares the existing read-only .NET Business Core smoke harness. It does not activate a write endpoint in the .NET API, deploy the API, merge the stacked PR chain, or route production traffic.

## Staging database synchronization

The staging project was missing the business workspace foundation that already exists in the repository migration history. The following additive staging-only migrations were applied through the Supabase management boundary:

1. `staging_business_workspace_smoke_readiness`
   - creates the business tenant, membership, and workspace-preference tables;
   - enables RLS on every exposed table;
   - restores authenticated grants and exact ownership/self-read policies;
   - installs the recursion-safe initial-owner helper;
   - installs the authenticated `create_business_workspace` RPC;
   - adds the required tenant and active-membership indexes.
2. `staging_smoke_identity_bootstrap_material`
   - creates a private, privilege-revoked bootstrap record for one-time generated identity material.
3. `staging_smoke_track_tenant_readiness`
   - adds private readiness timestamps and tenant tracking.
4. `staging_smoke_queue_signup_helper`
5. `staging_smoke_queue_signin_helper`
6. `staging_smoke_queue_workspace_helper`
7. `staging_smoke_live_verification_helpers`
   - all helper execution is revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role`.
8. `index_staging_business_members_invited_by`
   - adds the advisor-required covering index for `business_members.invited_by`.

The staging migration does not alter the production migration history. The underlying product schema remains sourced from the existing repository migrations, including the business workspace foundation and owner-policy recursion correction.

## Dedicated staging identity

A single non-anonymous, email/password staging identity was created through the official public Supabase Auth signup endpoint. The Auth endpoint created the password hash and identity row; no raw `auth.users` insertion was performed.

Email auto-confirm is disabled in this staging project. After signup created the valid Auth user and identity records, the isolated test record was confirmed database-side and marked with server-controlled app metadata:

- `jalvoro_environment = staging`
- `jalvoro_smoke_test = true`

The initial Auth Admin provisioning attempt was rejected because the staging Edge runtime supplied an incompatible internal JWT after the project's asymmetric signing-key transition. The fallback remained staging-only and preserved Supabase's Auth-created password and identity invariants.

## Tenant and membership creation

The dedicated identity signed in through `/auth/v1/token?grant_type=password` and received a one-hour bearer session. The authenticated session then called the real RLS-protected `create_business_workspace` RPC with:

- business type: services
- country: Pakistan
- currency: PKR
- timezone: Asia/Karachi

The RPC atomically created one business tenant, one active owner membership, and the user's active business workspace preference. No service-role database bypass was used for the tenant creation.

## Live verification evidence

The following remote checks passed against the staging Auth and Data APIs:

- `/auth/v1/user` returned `200`;
- returned subject matched the dedicated expected Auth user;
- audience was `authenticated`;
- identity was non-anonymous;
- exact tenant/self membership query returned `200` and exactly one row;
- membership role was `owner` and status was `active`;
- returned tenant and subject matched the expected values;
- a random cross-tenant query returned `200` with zero rows;
- the same membership query without a user session returned `401`.

These checks prove the live staging Auth, JWT, RLS, tenant, and membership path. The exact .NET Kestrel smoke remains manual-only and will obtain a fresh short-lived session at workflow runtime.

## Credential lifecycle

No credential, email address, password, access token, refresh token, user UUID, or tenant UUID is committed.

The durable staging identity credentials were moved into Supabase Vault under:

- `jalvoro_staging_smoke_email`
- `jalvoro_staging_smoke_password`

After verification:

- one-time bootstrap token material was overwritten;
- plaintext email/password fields in the private bootstrap record were overwritten;
- the short-lived access token and expiry were cleared;
- verification timestamps were recorded;
- all exposed roles remain revoked from the private bootstrap table.

## Bootstrap function retirement

The temporary `jalvoro-staging-smoke-bootstrap` Edge Function was replaced by version 5 with:

- JWT verification enabled;
- no identity-provisioning code;
- no bootstrap hash, email, password, or admin client;
- an unconditional `410 bootstrap_retired` response;
- `Cache-Control: no-store`.

The function slug remains only as an inert tombstone so an old invocation path cannot silently regain provisioning behavior.

## GitHub protected-environment contract

The manual workflow now obtains a fresh short-lived Supabase user session from these protected `staging` environment secrets:

- `JALVORO_SUPABASE_STAGING_PUBLISHABLE_KEY`
- `JALVORO_SUPABASE_STAGING_TEST_EMAIL`
- `JALVORO_SUPABASE_STAGING_TEST_PASSWORD`

It validates the returned session subject against:

- `JALVORO_SUPABASE_STAGING_TEST_USER_ID`

and resolves the prepared tenant from:

- `JALVORO_SUPABASE_STAGING_TENANT_ID`

The workflow masks the access token, never prints the Auth response body, and passes the token only to the existing .NET smoke process. A static expiring JWT is no longer a GitHub secret.

GitHub environment values must be synchronized by an authorized repository operator from the protected staging records. This repository change intentionally does not expose or commit those values.

## Advisor outcome

Post-change Security Advisor results reported no new finding on the business workspace tables or policies. Remaining notices are project-wide settings or pre-existing staging objects, including leaked-password protection and a separate load-test table with RLS but no policy.

Performance Advisor identified the new `business_members.invited_by` foreign key index gap; the covering partial index was added. Remaining unused-index notices are expected for newly created or currently empty staging structures, and unrelated pre-existing foreign-key notices remain outside this node.

## Preservation boundary

- production Supabase was not called or modified;
- Personal Tracking was not modified;
- no existing product file or migration was deleted;
- no .NET write endpoint was activated;
- no service-role or secret key was committed;
- no production deployment or traffic routing occurred;
- all repository changes remain stacked, draft, and unmerged.

`Preserve -> Extend -> Verify -> Migrate gradually -> Remove only after explicit approval`
