# Idempotent organization profile command

## Status

This node introduces the first bounded Business Core write command without routing production traffic or replacing legacy write paths.

- Command: `PUT /api/v1/organizations/{tenantId}/profile`
- Database RPC: `public.update_business_profile_v1`
- Authorization: exact verified tenant plus active owner membership and `organization.manage`
- Concurrency: required positive `expectedVersion`
- Idempotency: required 16–128 character `Idempotency-Key`
- Transaction boundary: profile mutation, replay record, and before/after audit evidence commit atomically
- Production write traffic: inactive
- Personal Tracking: untouched

## Command guarantees

The application boundary rejects malformed tenant IDs, invalid idempotency keys, invalid profile documents, missing identity, tenant mismatch, missing permission, and unavailable identity or membership dependencies before invoking the write store.

The Supabase RPC then independently verifies `auth.uid()`, the exact active owner membership, the expected profile version, and the request fingerprint. A per-command advisory transaction lock serializes duplicate races.

Outcomes are explicit:

- `updated`: one successful mutation and one audit row
- `replayed`: the stored successful response for the same key and payload
- `idempotency_conflict`: the same key was reused with another payload
- `version_conflict`: the caller used a stale profile version
- `forbidden`: authenticated subject is not the exact active owner
- `validation_failed`, `not_found`, or temporary dependency failure

## Database controls

The additive migrations provide:

- `public.businesses.profile_version`
- automatic version advancement for preserved legacy profile updates
- `private.business_command_idempotency`
- `private.business_profile_command_audit`
- actor and expiry/query indexes
- RLS-enabled private tables with deny policies for exposed roles
- no table grants to `anon`, `authenticated`, or `service_role`
- authenticated execution only for the bounded RPC
- fixed function search path and no dynamic SQL

Supabase Security Advisor reports the authenticated `SECURITY DEFINER` RPC because signed-in users can invoke it. This is intentional and bounded: the function has a fixed search path, reads the actor from `auth.uid()`, rechecks exact active-owner authorization inside the function, exposes no general table access, and returns only the command result. Converting it to `SECURITY INVOKER` would require exposing private idempotency and audit storage and would weaken the boundary.

## Reversible staging proof

The isolated staging project received the additive migrations. A protected manual workflow uses GitHub OIDC and a dedicated one-time replay-protected broker to obtain a fresh staging owner session. GitHub stores no staging password, persistent JWT, user ID, tenant ID, service-role key, or refresh token.

The live proof starts the production Business Core HTTP pipeline and verifies:

1. owner profile update succeeds;
2. exact duplicate returns `replayed` without another mutation;
3. same key plus changed payload returns `idempotency_conflict`;
4. stale expected version returns `version_conflict`;
5. a random tenant route returns `403`;
6. the original profile is restored;
7. the final profile is re-read and compared with the captured original.

GitHub Actions run `30148432330` completed successfully. Independent staging database evidence showed:

- profile version `1 -> 2 -> 3`;
- exactly two successful audit rows;
- exactly two idempotency records;
- no duplicate audit record for replay;
- current profile equal to the original captured profile after restoration.

## Environment isolation

The production Supabase project was checked read-only after the staging proof. It did not contain the new `profile_version` column, idempotency table, audit table, or command RPC. No production migration, deployment, or Business Core write traffic occurred.

## Activation gate

Production activation remains blocked until all of the following are explicit and green:

1. stacked prerequisite PRs are merged in order;
2. final CI, security scanning, and contract tests pass on the merge candidate;
3. production migration backup and rollback procedure are approved;
4. production migration is applied and independently verified;
5. deployment health and authentication probes pass;
6. canary traffic is enabled with monitoring and a fast disable path;
7. launch owner gives explicit production go-ahead.

Preservation rule: `Preserve -> Extend -> Verify -> Migrate gradually -> Remove only after explicit approval`.
