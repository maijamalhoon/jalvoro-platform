# Jalvoro Rollback and Recovery Plan

## Status

- Date: 2026-08-02
- Product baseline: `origin/main@404a8576e3ab52045f11542772ff6efaffeb0fe4`
- Superseded incorrect baseline: `52f236e999901a8af1b675e890dd866f4cbb001a`
- Audit branch: `audit/deep-production-readiness-20260802` in a dedicated isolated worktree
- State: **PLANNED — NOT EXECUTED**
- Production change made by this audit: None

This is the rollback contract for future implementation work identified by the audit. It does not authorize a deployment, database command, restore, PR mutation, or production change.

## Non-Negotiable Preconditions

1. Name one incident commander, deploy owner, database owner, and communications owner.
2. Record the exact Git SHA, immutable build/deployment ID, migration versions, Vercel project/team, Supabase project refs, environment, start time, and change window.
3. Confirm an earlier healthy deployment is still deployable and its environment-variable **names/scopes** are compatible.
4. Produce encrypted off-site database and Storage-object backups; record hashes, timestamps, retention, RPO/RTO, and restore owner.
5. Restore those artifacts into an isolated project and run schema, row-count, RLS, auth, signed-object, and application smoke checks.
6. Rehearse migrations from both an empty database and a copy of the existing schema. Stop on an unexpected diff.
7. Define metric/log/Sentry thresholds and a bounded monitoring window before rollout.

The current Free Supabase plan does not satisfy the backup/restore precondition. Database backups alone do not restore Storage object bytes.

## Rollback Decision Triggers

Stop rollout and invoke the applicable playbook for any of:

- privileged access succeeds without matching recent control-plane AAL2;
- cross-tenant read/write, RLS regression, or unintended grant;
- authentication callback loop, broad login failure, or session corruption;
- ledger, balance, currency, refund, inventory, payroll, or investment reconciliation mismatch;
- migration error, destructive/unexpected schema diff, lock contention, or elevated database errors;
- elevated 5xx/error rate, severe latency, runaway egress/cost, queue/realtime backlog, or client crash loop;
- missing/incorrect environment variable scope, provider key failure, or deployment SHA mismatch;
- incomplete restore, missing Storage objects, or inability to identify the previous healthy artifact.

Security/data-integrity triggers require traffic containment and forward repair even if the web artifact is rolled back.

## Rollback Classes

| Change class | Primary recovery | Important limitation |
| --- | --- | --- |
| Web/application code | Promote the recorded previous healthy immutable deployment | Old code must remain schema- and environment-compatible. |
| Environment/configuration | Restore versioned names/scopes/values through the authorized platform owner, then redeploy the known artifact | Never paste values into tickets, logs, docs, or chat. |
| Dependency/lockfile | Revert only the focused dependency commit and rebuild from a clean install | Do not restore an actively vulnerable version merely to make CI green. |
| Additive database object | Disable new code path; forward-drop only after dependency and usage proof | Ordinary Git/Vercel rollback does not undo schema state. |
| Destructive/data migration | Stop writes, preserve evidence, restore or execute a reviewed forward repair | Never blindly down-migrate production data. |
| Privilege/RLS/security | Keep the safer/revoked state; forward-fix missing legitimate access | Do not reopen a confirmed bypass as a convenience rollback. |
| Index | Drop the exact new index concurrently if write/plan regression is proven | Verify no constraint depends on it. |
| Calculation behavior | Disable/rollback the new version while preserving immutable source records; reconcile derived outputs | Never delete transaction/audit history to hide a discrepancy. |
| Storage | Restore object bytes plus metadata/policy state and reconcile checksums | Database restore alone is insufficient. |

## Playbooks

### RB-001 — Privileged RPC hardening

- Roll forward is preferred: retain revoked direct grants and correct any missing gateway allowlist/routing.
- If the new gateway code is defective, restore the previous application artifact while direct legacy grants remain closed; use an authorized emergency operator workflow.
- Verify catalog privileges, AAL1 negatives, recent-AAL2 positives, audit events, identity match, and disabled-role denial.
- Do not restore direct `authenticated` execution as a rollback.

### RB-002 — Dependency policy

- Current candidate: draft PR #206, exact head `947a152da1414f04b3cd6d8f0f802db225621c67`, with clean commits `c96c642a6617ec2bfff17ca968cc953a9ff82e24` and `947a152da1414f04b3cd6d8f0f802db225621c67`; no deployment, migration, or production state exists to roll back.
- Before merge, rollback is closure/abandonment of the focused PR while preserving its branch and evidence; no production action is required.
- After merge, first record the actual landed `main` SHA and merge method. Revert the landed merge, squash, or rebased commit set as appropriate only if a confirmed tooling regression requires it, then rebuild from a canonical clean install.
- Re-run clean install, both npm audits, policy gate, lint, typecheck, tests, build, and Edge checks.
- Reversion restores the vulnerable development-only `brace-expansion@1.1.16` copy and the expired exception, so it is mechanically safe but not a security resolution. Keep release blocked and use a new forward fix instead of disabling the audit job or treating the restored graph as releasable.
- Preserve the three-file scope: `package-lock.json`, `scripts/dependency-audit-policy.mts`, and `lib/dependency-audit-policy.test.ts`. No database, customer data, environment, deployment, or runtime application rollback is involved.

### RB-003 — Supabase plan, backup, and password protection

- Plan upgrades and leaked-password protection should not be rolled back during launch stabilization.
- If auth behavior changes, investigate policy/configuration in isolation; preserve protection and use a staged forward correction.
- Prove daily backup visibility and run an isolated database-plus-Storage restore before relying on it.

### RB-004 — Migration reconciliation and schema changes

- Before production: discard/recreate only the disposable branch and correct the migration ledger; do not alter production history.
- After production DDL: stop application rollout, capture catalog/log evidence, and choose a reviewed forward fix or point-in-time restore based on data impact.
- Restore requires a new isolated target first, reconciliation, then explicit incident authorization for cutover.
- Validate extensions, grants, RLS, function ownership/search paths, triggers, constraints, indexes, row counts, auth identities, Storage metadata, and object bytes.

### RB-005 — Vercel deployment/configuration

- Promote the recorded previous healthy deployment in the authoritative project.
- Confirm domain routing, environment scope, health, auth callback URLs, Supabase project refs, and error telemetry after promotion.
- If schema compatibility prevents artifact rollback, contain traffic and deploy a minimal forward-compatible repair.

### RB-006 — Transaction pagination/search

- Feature-disable bounded search or revert the focused application/RPC commit while retaining stable prior semantics.
- If a new additive index/function is unused, leave it safely in place until a separately reviewed cleanup.
- Verify no gaps/duplicates, soft-deleted history, transfers, filters, receipt links, and deterministic ordering.

### RB-007 — Investment aggregation

- Disable the new grouping/quote-selection version and return to prior presentation logic without mutating source lots/transactions.
- Compare old/new derived totals, identify affected identities, and reconcile deliberately; never rewrite history automatically.

### RB-008 — POS indexes

- Drop only the exact regressing index with the production-safe concurrent procedure and an explicit owner.
- Record query plans, lock/wait state, writes, disk, and cascade/delete timing before and after.

### RB-009 — Install-dialog and URL/ARIA changes

- Revert the focused component/test commit or disable the prompt via an existing safe flag if one is formally introduced.
- Verify login/start navigation, query persistence, keyboard focus, scroll restoration, responsive matrix, axe, and accessibility tree.

### RB-010 — PR triage

- Preserve branch SHAs/patches before close, rebase, or retarget.
- A GitHub metadata change can be reversed, but lost context cannot; record owner decisions and dependency order.
- Never merge a stale broad branch as a shortcut to recover work.

## Post-Rollback Verification

- Confirm the running deployment and Git SHA, not only a successful platform action.
- Run the journey most directly affected plus login, tenant isolation, privileged negatives, transaction reconciliation, and health checks.
- Inspect Vercel/runtime/Sentry/Supabase logs over the predefined window.
- Compare database schema, migration ledger, row counts, RLS/grants, and Storage inventory to the recorded baseline.
- Record residual risk, customer/data impact, exact recovery actions, and follow-up owner.
- Do not declare recovery if monitoring access or exact deployment identity remains unknown.

## Current Recovery Gaps

- Authoritative Jalvoro Vercel project, deployment SHA, and prior healthy artifact are `BLOCKED` by access.
- Sentry issue/event health is `BLOCKED` by missing local read-only credentials/configuration.
- Managed Supabase daily backups and leaked-password protection are unavailable on the current Free projects.
- A database-plus-Storage restore drill has not run.
- Migration histories are divergent and must be reconciled before any production command.
- No safe authenticated synthetic environment exists for end-to-end post-rollback verification.

Until these gaps are closed, rollback readiness is **FAIL** and production launch remains blocked.
