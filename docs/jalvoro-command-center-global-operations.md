# JALVORO Command Center — Global Operations

## Purpose

Global Operations is the Phase 3 worldwide operational view for the JALVORO Command Center. It extends the existing Global Overview without replacing security, incident, compliance, release, access, billing, privacy, or support centers.

The first implementation cycle provides:

- registered product and family counts;
- application, module, service, environment, region, and platform topology;
- product lifecycle, registration, data-classification, and retention visibility;
- aggregate subscription status visibility;
- configured product regions;
- privacy-safe country and coarse regional telemetry;
- device, operating-system, browser, and application-version distribution;
- an explicit unavailable state for organization operations.

## Truthfulness boundary

The current Supabase data plane does not contain a registered organization or organization-membership model. The Command Center therefore returns the controlled status `not_registered` with zero organization counts and does not present those values as production adoption.

Organization management remains disabled until a multi-tenant organization source, membership model, scoped authorization contract, and audit lifecycle are registered.

## Privacy boundary

The Global Operations RPC returns aggregate operational data only. It excludes:

- emails and account identities;
- user, telemetry subject, and session identifiers;
- payment-provider customer or subscription identifiers;
- finance records, notes, balances, payroll, and transaction content;
- raw webhook payloads;
- raw IP addresses and city values;
- arbitrary metadata;
- session replay.

Country and region signals are coarse approved telemetry fields. The contract reports `rawIpStored: false` and `sessionReplayEnabled: false`; the TypeScript parser fails closed if either boundary is violated.

## Authorization

- The page authenticates with `supabase.auth.getUser()` on the server.
- It calls the existing aggregate `get_platform_admin_snapshot` RPC.
- The private global-operations function verifies an active `private.platform_admins` record.
- Direct execution on the private function is revoked from `PUBLIC`, `anon`, and `authenticated`.
- Navigation remains server-resolved through the Product and Module Registry.
- The module reuses `command-center:overview:view` through explicit `global-operations` module-scoped mappings for Owner, Admin, Analyst, and Support.
- The permission is not made product-wide, environment-wide, or global, and no management permission is introduced.
- No browser-side permission calculation is introduced.

## Operational contract

The response is grouped into:

- `products`
- `organizations`
- `subscriptions`
- `regionalOperations`
- `platformAnalytics`

The UI is server-rendered, has truthful empty states, and does not load a chart library, poll the database, or query Supabase from the browser.

## Production verification

The production migration and manifest lifecycle were completed before the application merge:

- Command Center manifest version 2 passed submission, validation, 24-hour Owner approval, SHA-256 verification, and activation;
- four append-only audit events were recorded for submission, validation, approval, and activation;
- the registry contains three enabled modules and two registered services;
- the active Owner resolves `/admin`, `/admin/global-operations`, and `/admin/icon-system` in production;
- the aggregate response reports `rawIpStored: false`, `sessionReplayEnabled: false`, and organization source `not_registered`;
- Supabase advisors reported no new Command Center security or missing-index finding.

## Known staging drift

The staging project currently lacks `public.profiles`, while the pre-existing user-operations snapshot still references that table. Direct verification of the new private Global Operations function succeeds; the combined legacy snapshot cannot complete in staging until that unrelated drift is repaired. Production already contains the expected profile dependency.

## Next Phase 3 cycles

1. Register a migration-safe organization, membership, and tenant-scoped authorization foundation.
2. Add organization lifecycle and administrator operations with append-only audit.
3. Add product drill-down and controlled product configuration operations.
4. Add subscription and billing exception workflows without exposing provider secrets.
5. Add country and regional operational policy/configuration management.
