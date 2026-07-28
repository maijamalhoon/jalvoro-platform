# Integration rehearsal — 2026-07-27

This branch combines the verified audit, product-entry, immutable-realm, Business identity, workforce, and Retail POS tranches with the current `main` branch.

## Included stack

1. Production audit and repairs (`#172`)
2. Product entry and organization registration (`#177`)
3. Immutable Individual/Business realms (`#178`)
4. Least-privilege Business roles (`#179`)
5. Owner-audited MFA recovery (`#180`)
6. POS workforce security (`#184`)
7. POS sale bridge (`#185`)
8. POS purchase, expense, refund, void, and cash-adjustment bridge (`#186`)
9. Current `main` deletions of stale Vercel deployment trigger/configuration files

## Rehearsal gates

- Verify current `main` is an ancestor of the integration head.
- Replay every Supabase migration on a disposable local database.
- Run all SQL regression files with `ON_ERROR_STOP`.
- Run PL/pgSQL lint at error level.
- Verify critical realm, identity, POS security, sale, and operations RPCs exist.
- Run the repository's normal CI, security, currency, and production-audit workflows.

## Migration-history repairs discovered by rehearsal

- Added a schema-only baseline for the legacy personal-finance tables and the original auth-profile trigger that predated timestamped repository migrations.
- Restored the missing `archive_transaction(uuid)` migration before the security grant migration that depends on it.
- Renamed the withdrawal-function migration from duplicate version `20260721023000` to unique ordered version `20260721023100` without changing its SQL bytes.
- Assigned unique, dependency-aware versions to every remaining duplicate migration timestamp; migration SQL bytes were not changed.
- Moved the complete Business contacts and sales-invoicing migration before purchase accounting, because supplier bills require the shared contacts table.
- Moved the complete inventory foundation after purchase accounting and before return operations, because returns require warehouse, product, balance, and stock-movement tables.
- Fixed malformed Business workspace currency normalization syntax.
- Canonicalized legacy Simple Shop permission patch targets without changing permissions.
- Made the Business report date-filter correction idempotent when the source function is already fixed.
- Moved the AI preferences foundation before its RLS optimizer.
- Moved the sealed finance-backup registry and base import/export functions before category-mapping and same-account recovery patches that depend on them.

## Production-schema compatibility rehearsal — 2026-07-28

A schema-only dump from the hosted production Supabase project was restored into a disposable local Docker/Supabase database. The hosted project was queried read-only only; no hosted migration, Auth mutation, data write, Edge Function deployment, Vercel deployment, domain change, or DNS change was performed.

Production baseline:

- Hosted PostgreSQL version observed read-only: `17.6`
- Hosted latest applied migration before this stack: `20260726074854_add_command_center_session_bridge`
- Pending integration migrations applied locally: 14

Schema-only dump omissions were restored only inside the disposable local parity database:

- `supabase_migrations.schema_migrations` readiness metadata
- canonical `billing.plans` free-plan reference row
- enabled `auth.users` trigger `create_default_billing_subscription`

The trigger was independently verified as enabled through a read-only hosted catalog query before the local parity fixture was created.

Final result:

- Production schema restore: passed
- 14 pending migrations: passed in timestamp order
- Migration readiness metadata: 12/12 confirmed
- SQL regression files: 8/8 passed
- Admin billing contract: passed
- Business identity recovery: passed
- POS operations bridge: passed
- POS sale bridge: passed
- POS workforce security: passed
- Business role templates: passed
- Immutable Individual/Business realms: passed
- RLS user isolation: passed
- Invalid or unready index probe: passed
- Critical POS and account-realm RPC presence probes: passed

Local evidence:

`rehearsal-evidence/production-baseline-rehearsal.log`

The evidence directory is excluded from Git because it contains local artifacts derived from the production schema.

## Release boundary

The production-schema compatibility blocker is cleared for this exact integration head. Review and merge, hosted migration execution, production database verification, Vercel Preview, and Vercel Production remain separate controlled release actions.

Do not use production or the Command Centre database as a test environment.
