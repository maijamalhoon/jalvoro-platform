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

The Supabase RPC independently verifies `auth.uid()`, locks the exact business row, verifies the current owner and active owner membership, and only then reads or deletes idempotency state. The authenticated actor is part of the request fingerprint and must match the actor stored with a replay record. A per-command advisory transaction lock serializes duplicate races.

Outcomes are explicit:

- `updated`: one successful mutation and one audit row
- `replayed`: the stored successful response for the same actor, key, and payload
- `idempotency_conflict`: the key belongs to another actor or was reused with another payload
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
- authorization-before-replay ordering
- actor-bound fingerprints and stored replay responses

Supabase Security Advisor reports the authenticated `SECURITY DEFINER` RPC because signed-in users can invoke it. This is intentional and bounded: the function has a fixed search path, reads the actor from `auth.uid()`, locks and rechecks exact active-owner authorization before touching replay state, exposes no general table access, and returns only the command result. `PUBLIC`, `anon`, and `service_role` execution remain revoked. Converting it to `SECURITY INVOKER` would require exposing private idempotency and audit storage and would weaken the boundary.

## Security correction found during final audit

The first staging version checked stored idempotency state before its owner and membership checks. The .NET handler remained fail-closed, but an authenticated caller could invoke the exposed PostgREST RPC directly and reach the replay branch before database authorization.

Migration `20260725072000_harden_business_profile_replay_authorization.sql` corrects that order and permanently locks the following contract:

1. bind the actor from `auth.uid()`;
2. compute an actor-bound request fingerprint;
3. acquire the command advisory lock;
4. lock the business row;
5. require current ownership;
6. lock and require the active owner membership;
7. only then clean up or read replay state;
8. require the stored replay actor to match the current actor.

A live staging negative test used an unrelated authenticated subject against an existing replay record and received `forbidden`. The test produced no profile, audit, or idempotency mutation.

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
- current profile equal to the original captured profile after restoration;
- zero invalid audit-version rows;
- zero replay records without an actor.

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
