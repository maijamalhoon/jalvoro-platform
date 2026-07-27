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

## Hard boundary

This rehearsal does not link to or modify a hosted Supabase project. It does not deploy Edge Functions, merge to `main`, trigger Vercel, change DNS, or modify production data.
