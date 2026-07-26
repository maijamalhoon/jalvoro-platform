# Database recovery, migration integrity, and rollback

Status: mandatory gate not passed. No production database write is authorized by this document.

## Current evidence

| Item | jalvoro-production | jalvoro-control-plane |
| --- | --- | --- |
| Project ref | `tdagzmgcgjlyqzegmizg` | `zzvpovvuybfihwgjrder` |
| Applied migrations observed | 254 | 6 |
| Backup capability confirmed | No | No |
| Logical export created/read | No | No |
| Isolated restore tested | No | No |
| Zero-to-head replay | No | No |

The production history has two distinct versions named `lock_down_public_rpc_and_optimize_rls` (`20260625124239` and `20260625131348`). This is documented as a naming collision; versions remain unique and must not be rewritten.

Version `20260722080132` is recorded as `placeholder`. Its filename/history must not be renamed in place because it is already applied. During replay, verify that its SQL is intentional and record its actual purpose in the migration evidence.

Repository migration `20260726090000_activate_global_organization_summary.sql` is pending in production. Migration `20260726120000_disable_business_document_uploads_until_scanning.sql` was added by this candidate and is also pending. Neither may be applied before export and isolated replay succeed.

## Owners and objectives

| Responsibility | Owner role | Objective |
| --- | --- | --- |
| Declare incident and approve recovery | Incident Commander | decision within 15 minutes |
| Export, restore, and validate database | Database Owner | provisional RTO: 2 hours |
| Validate application workflows | Application Owner | smoke result within 30 minutes of restore |
| Repoint deployment and configuration | Release Owner | traffic switch within 15 minutes |
| Verify DNS and edge behavior | Edge Owner | propagation target governed by current TTL |

The two-hour RTO is a target, not measured evidence. RPO is not established until the active Supabase backup plan and retention are confirmed.

## Required export evidence

Use a dedicated, short-lived database credential through an approved secrets channel. Never paste it into an issue, log, or chat.

Following the [Supabase backup guidance](https://supabase.com/docs/guides/platform/backups), export roles, schema, and data into an encrypted evidence location:

```bash
supabase db dump --db-url "$SOURCE_DATABASE_URL" -f roles.sql --role-only
supabase db dump --db-url "$SOURCE_DATABASE_URL" -f schema.sql
supabase db dump --db-url "$SOURCE_DATABASE_URL" -f data.sql --use-copy --data-only
```

Evidence required:

1. command exit status and sanitized tool versions;
2. SHA-256 for each export;
3. nonzero file sizes;
4. readable SQL headers and complete final statements;
5. encrypted storage location, retention, and named owner;
6. no secrets or row contents in CI logs.

## Isolated restore and zero-to-head replay

1. Obtain the Supabase organization ID.
2. Run the connector cost estimate for a temporary branch.
3. Record the quoted hourly cost and obtain explicit approval.
4. Create an isolated branch; never use production customer data for destructive tests.
5. Restore the export into the isolated database with stop-on-error enabled.
6. Verify row-count ranges without exporting personal rows.
7. Separately create a clean empty environment and apply repository migrations in version order from zero, following the [Supabase migration workflow](https://supabase.com/docs/guides/deployment/database-migrations).
8. Apply both pending migrations only in isolation.
9. Fail the gate on any manual SQL edit, ignored error, duplicate version, missing extension, or environment drift.

Validate schema, RLS, grants, functions, triggers, storage buckets/policies, seed/bootstrap data, tenant isolation, and application login against the restored environment. Capture sanitized command logs and test IDs.

## Database rollback

Applied migrations are immutable. Do not rename, delete, or edit an applied migration.

- Before application: remove the unapplied change from the candidate.
- After application: deploy a reviewed forward rollback migration.
- For additive objects: remove only objects introduced by the exact version after dependency checks.
- For destructive or data-shape changes: restore the isolated-verified export to a new environment, test it, then switch traffic. Do not overwrite production in place.
- For the business-document upload gate: a forward rollback must restore the exact policy and grants from `20260723055116_business_company_documents_records_engine.sql`; only do so after a malware-scanning release passes certification.

## Platform rollback procedures

### Vercel

Record the previous production deployment ID before promotion. Roll back without rebuilding:

```bash
vercel rollback <previous-deployment-id-or-url>
vercel rollback status
```

Then verify protected redirects, API authentication, and error rate. Reference: [Vercel rollback](https://vercel.com/docs/cli/rollback).

### Supabase Edge Functions

No candidate Edge Function change is currently identified. If that changes, archive the exact previous source SHA and configuration, then redeploy the previous function source with `supabase functions deploy <name> --project-ref <project-ref>`. Verify JWT policy and smoke tests before restoring traffic.

### Environment variables

Export variable names and encrypted values through the provider's approved backup mechanism before change. Rollback restores the previous environment-scoped version, triggers a new immutable deployment, and verifies that preview, staging, and production did not cross-contaminate. Never copy secrets into release notes.

### Domain and DNS

Keep the public domain disconnected until certification. Before cutover, export the Cloudflare zone, record TTLs and the current Vercel aliases, then follow `docs/release/cloudflare-cutover.md`. Rollback restores previous records, pauses new cache rules, purges only affected public assets, and verifies authenticated traffic bypasses cache.
